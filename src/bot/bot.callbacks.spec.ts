import {
  EDIT_FIELD_RE,
  EDIT_MENU_RE,
  EDIT_PHOTOS_RE,
  PHOTOS_CLEAR_RE,
} from './bot.callbacks';

const ID = '3f2b8c1e-0d4a-4f6b-9a1c-2e5d7f8a9b0c';

describe('bot edit callbacks', () => {
  it('edit_<id> opens the edit menu', () => {
    expect(EDIT_MENU_RE.exec(`edit_${ID}`)?.[1]).toBe(ID);
  });

  it.each(['name', 'price', 'url', 'description', 'photos'])(
    'edit menu does not swallow edit_%s_<id>',
    (field) => {
      expect(EDIT_MENU_RE.test(`edit_${field}_${ID}`)).toBe(false);
    },
  );

  it('photos edit has its own handler, not the text-field one', () => {
    expect(EDIT_PHOTOS_RE.exec(`edit_photos_${ID}`)?.[1]).toBe(ID);
    expect(EDIT_FIELD_RE.test(`edit_photos_${ID}`)).toBe(false);
    expect(EDIT_FIELD_RE.exec(`edit_url_${ID}`)?.slice(1)).toEqual(['url', ID]);
  });

  it('photos_clear_<id> does not collide with photos_done', () => {
    expect(PHOTOS_CLEAR_RE.exec(`photos_clear_${ID}`)?.[1]).toBe(ID);
    expect(PHOTOS_CLEAR_RE.test('photos_done')).toBe(false);
  });
});
