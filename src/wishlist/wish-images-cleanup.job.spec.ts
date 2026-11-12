import { MediaService } from 'src/media/service/media.service';
import type { IWishlistRepository } from './repository/wishlist.repository';
import {
  ORPHAN_GRACE_MS,
  WishImagesCleanupJob,
} from './wish-images-cleanup.job';

const NOW = new Date('2026-12-01T04:00:00Z');
const daysAgo = (d: number) => new Date(NOW.getTime() - d * 24 * 3600 * 1000);

describe('WishImagesCleanupJob', () => {
  let media: MediaService;
  let repo: { findAttachedImageKeys: jest.Mock };
  let remove: jest.SpyInstance;
  let job: WishImagesCleanupJob;

  beforeEach(() => {
    media = new MediaService();
    remove = jest.spyOn(media, 'remove').mockResolvedValue(undefined);
    repo = { findAttachedImageKeys: jest.fn() };
    job = new WishImagesCleanupJob(
      repo as unknown as IWishlistRepository,
      media,
    );
  });

  it('removes old files that no wish uses', async () => {
    jest.spyOn(media, 'listStored').mockResolvedValue([
      { key: 'used', modifiedAt: daysAgo(40) },
      { key: 'orphan', modifiedAt: daysAgo(40) },
    ]);
    repo.findAttachedImageKeys.mockResolvedValue(['used']);

    await expect(job.removeOrphans(NOW)).resolves.toEqual(['orphan']);
    expect(remove).toHaveBeenCalledWith(['orphan']);
  });

  it('keeps fresh uploads that may belong to an unsaved draft', async () => {
    jest.spyOn(media, 'listStored').mockResolvedValue([
      {
        key: 'fresh',
        modifiedAt: new Date(NOW.getTime() - ORPHAN_GRACE_MS + 1000),
      },
      { key: 'old', modifiedAt: daysAgo(10) },
    ]);
    repo.findAttachedImageKeys.mockResolvedValue([]);

    await expect(job.removeOrphans(NOW)).resolves.toEqual(['old']);
    expect(repo.findAttachedImageKeys).toHaveBeenCalledWith(['old']);
  });

  it('does not query the database when there is nothing old', async () => {
    jest.spyOn(media, 'listStored').mockResolvedValue([]);
    await expect(job.removeOrphans(NOW)).resolves.toEqual([]);
    expect(repo.findAttachedImageKeys).not.toHaveBeenCalled();
    expect(remove).not.toHaveBeenCalled();
  });

  it('run() logs instead of crashing when storage fails', async () => {
    jest.spyOn(media, 'listStored').mockRejectedValue(new Error('disk gone'));
    await expect(job.run()).resolves.toBeUndefined();
  });
});
