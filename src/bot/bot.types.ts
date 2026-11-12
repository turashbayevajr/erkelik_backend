import { Context } from 'telegraf';

export type Step =
  | undefined
  | 'waiting_for_name'
  | 'waiting_for_price'
  | 'waiting_for_url'
  | 'waiting_for_description'
  | 'waiting_for_username';

export interface DraftItem {
  name: string;
  price: string | null;
  url: string | null;
  description: string | null;
  /** Ключи загруженных фото (MediaService), по порядку получения. */
  imageKeys?: string[];
}

export interface EditingItem {
  id: string;
  name: string;
  price: string | null;
  url: string | null;
  description: string | null;
  ownerId: number;
  /** Новый набор фото; undefined — фото не меняли. */
  imageKeys?: string[];
}

export interface BotSessionData {
  step?: Step;
  item?: DraftItem;

  // editing
  editingItem?: EditingItem;
  editingItemId?: string;
  editingField?: 'name' | 'price' | 'url' | 'description' | 'photos';

  // альбом: на каждую его фотографию приходит отдельный апдейт —
  // отвечаем только на первую
  lastMediaGroupId?: string;

  // deletion
  itemToDeleteId?: string;

  // cached current user
  me?: {
    id: number; // DB user id
    telegramId: bigint; // Telegram id
    locale: 'EN' | 'RU' | 'KK';
  };
}

export type BotContext = Context & { session: BotSessionData };
