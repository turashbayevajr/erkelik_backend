import { Context } from 'telegraf';

export type Step =
  | undefined
  | 'waiting_for_name'
  | 'waiting_for_price'
  | 'waiting_for_url'
  | 'waiting_for_username';

export interface DraftItem {
  name: string;
  price: string | null;
  url: string | null;
}

export interface EditingItem {
  id: string;
  name: string;
  price: string | null;
  url: string | null;
  ownerId: number;
}

export interface BotSessionData {
  step?: Step;
  item?: DraftItem;

  // editing
  editingItem?: EditingItem;
  editingItemId?: string;
  editingField?: 'name' | 'price' | 'url';

  // deletion
  itemToDeleteId?: string;

  // cached current user
  me?: {
    id: number;            // DB user id
    telegramId: bigint;    // Telegram id
    locale: 'EN' | 'RU' | 'KK';
  };
}

export type BotContext = Context & { session: BotSessionData };
