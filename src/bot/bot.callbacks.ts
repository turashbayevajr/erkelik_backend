// Callback-данные редактирования желания (`<action>_<id>`). Вынесены сюда,
// чтобы тесты держали инвариант: общий `edit_<id>` не перехватывает
// экшены конкретных полей.

/** Меню правки: edit_<id>, но не edit_name_|price_|url_|description_|photos_. */
export const EDIT_MENU_RE =
  /^edit_(?!name_|price_|url_|description_|photos_)([\w-]+)$/;
/** Правка текстового поля: edit_<field>_<id>. */
export const EDIT_FIELD_RE = /^edit_(name|price|url|description)_([\w-]+)$/;
/** Правка фото: edit_photos_<id>. */
export const EDIT_PHOTOS_RE = /^edit_photos_([\w-]+)$/;
/** Убрать все фото в правке: photos_clear_<id>. */
export const PHOTOS_CLEAR_RE = /^photos_clear_([\w-]+)$/;
