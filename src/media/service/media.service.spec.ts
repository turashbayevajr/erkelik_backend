import { BadRequestException } from '@nestjs/common';
import { promises as fs } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import * as sharp from 'sharp';
import { MediaService } from './media.service';

describe('MediaService', () => {
  let dir: string;
  let media: MediaService;

  beforeEach(async () => {
    dir = await fs.mkdtemp(join(tmpdir(), 'erkelik-media-'));
    process.env.UPLOADS_DIR = dir;
    media = new MediaService();
  });

  afterEach(async () => {
    delete process.env.UPLOADS_DIR;
    await fs.rm(dir, { recursive: true, force: true });
  });

  const jpeg = (width: number, height: number) =>
    sharp({
      create: { width, height, channels: 3, background: '#c0453b' },
    })
      .jpeg()
      .toBuffer();

  it('stores a resized webp owned by the uploader', async () => {
    const saved = await media.saveImage(await jpeg(3000, 2000), 7);
    expect(saved.key).toMatch(/^7-[0-9a-f-]{36}\.webp$/);
    expect(saved).toMatchObject({ width: 1280, height: 853 });
    expect(media.isOwnedBy(saved.key, 7)).toBe(true);
    expect(media.isOwnedBy(saved.key, 8)).toBe(false);
    const meta = await sharp(join(dir, saved.key)).metadata();
    expect(meta.format).toBe('webp');
    expect(meta.exif).toBeUndefined();
  });

  it('keeps small images at their size', async () => {
    const saved = await media.saveImage(await jpeg(400, 600), 1);
    expect(saved).toMatchObject({ width: 400, height: 600 });
    await expect(media.describe(saved.key)).resolves.toEqual(saved);
  });

  it('rejects data that is not an image', async () => {
    await expect(
      media.saveImage(Buffer.from('<?php echo 1; ?>'), 1),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('refuses path-like keys', async () => {
    expect(media.isValidKey('../../etc/passwd')).toBe(false);
    expect(media.isValidKey('1-x.webp')).toBe(false);
    await expect(media.describe('../secret.webp')).resolves.toBeNull();
  });

  it('removes files and ignores missing ones', async () => {
    const saved = await media.saveImage(await jpeg(100, 100), 1);
    await media.remove([
      saved.key,
      '1-00000000-0000-4000-8000-000000000000.webp',
    ]);
    await expect(media.describe(saved.key)).resolves.toBeNull();
  });

  it('lists stored photos and converts them to JPEG for Telegram', async () => {
    const saved = await media.saveImage(await jpeg(300, 200), 1);
    await fs.writeFile(join(dir, 'notes.txt'), 'not a photo');
    const stored = await media.listStored();
    expect(stored.map((f) => f.key)).toEqual([saved.key]);
    const out = await sharp(await media.readAsJpeg(saved.key)).metadata();
    expect(out).toMatchObject({ format: 'jpeg', width: 300, height: 200 });
  });

  it('lists nothing when the folder does not exist yet', async () => {
    process.env.UPLOADS_DIR = join(dir, 'missing');
    await expect(media.listStored()).resolves.toEqual([]);
  });
});
