import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import {
  createWish,
  fetchFriendView,
  fetchMyWishes,
  fulfillWish,
  orderWish,
  reserveWish,
  sendFriendRequestTo,
  subscribeTo,
  unreserveWish,
  unsubscribeFrom,
  updateWish,
} from '../api';
import type { ApiFriendView, ApiWish } from '../api';

// Реальный слой данных поверх /api под ApiAuthGuard. Провайдер рендерится
// только после авторизации (Gate в App), поэтому просто фетчит на маунте.

export type WishStatus = 'OPEN' | 'RESERVED' | 'ORDERED' | 'FULFILLED';
export type WishVisibility = 'PUBLIC' | 'FRIENDS' | 'CUSTOM';

export interface Wish {
  id: string;
  name: string;
  price?: string;
  url?: string;
  domain?: string;
  description?: string;
  imageUrl?: string;
  status: WishStatus;
  visibility?: WishVisibility;
  allowedUserIds?: number[];
  reservedByMe?: boolean;
}

export interface NewWish {
  name: string;
  price?: string;
  url?: string;
  domain?: string;
  description?: string;
  imageUrl?: string;
  visibility?: WishVisibility;
  allowedUserIds?: number[];
}

function parseDomain(raw?: string | null): string | undefined {
  if (!raw) return undefined;
  try {
    const url = new URL(raw.includes('://') ? raw : `https://${raw}`);
    return url.hostname.includes('.')
      ? url.hostname.replace(/^www\./, '')
      : undefined;
  } catch {
    return undefined;
  }
}

function formatPrice(price: string | null): string | undefined {
  if (!price) return undefined;
  const n = Number(price);
  return Number.isFinite(n) ? `${n.toLocaleString('ru-RU')} ₸` : price;
}

// «12 900 ₸» из поля ввода → «12900» для Decimal на бэке.
function normalizePriceInput(raw?: string): string | undefined {
  if (!raw) return undefined;
  const cleaned = raw.replace(/[^\d.,]/g, '').replace(',', '.');
  return cleaned || undefined;
}

function toWish(w: ApiWish): Wish {
  return {
    id: w.id,
    name: w.name,
    price: formatPrice(w.price),
    url: w.url ?? undefined,
    domain: parseDomain(w.url),
    description: w.description ?? undefined,
    status: w.status,
    visibility: w.visibility,
    reservedByMe: w.reservedByMe,
  };
}

type WishesState = {
  loading: boolean;
  myWishes: Wish[];
  friendUsername: string | null;
  friendName: string;
  friendWishes: Wish[];
  friendLoading: boolean;
  friendNotFound: boolean;
  subscribedToFriend: boolean;
  friendRequestSent: boolean;
  openFriend: (username: string) => Promise<boolean>;
  clearFriend: () => void;
  toggleSubscribe: () => Promise<void>;
  sendFriendRequest: () => Promise<void>;
  addWish: (w: NewWish) => Promise<void>;
  updateWish: (id: string, w: NewWish) => Promise<void>;
  reserve: (id: string) => Promise<void>;
  unreserve: (id: string) => Promise<void>;
  markOrdered: (id: string) => Promise<void>;
  markFulfilled: (id: string) => Promise<void>;
  find: (id: string) => Wish | undefined;
};

const WishesContext = createContext<WishesState | null>(null);

export function WishesProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [myWishes, setMyWishes] = useState<Wish[]>([]);
  const [friendUsername, setFriendUsername] = useState<string | null>(null);
  const [friendView, setFriendView] = useState<ApiFriendView | null>(null);
  const [friendLoading, setFriendLoading] = useState(false);
  const [friendNotFound, setFriendNotFound] = useState(false);

  const reloadMy = useCallback(async () => {
    const list = await fetchMyWishes();
    setMyWishes(list.map(toWish));
  }, []);

  useEffect(() => {
    reloadMy()
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [reloadMy]);

  const loadFriend = useCallback(async (username: string) => {
    const view = await fetchFriendView(username);
    setFriendView(view);
    setFriendUsername(username);
  }, []);

  const openFriend = useCallback(
    async (raw: string) => {
      const username = raw.trim().replace(/^@/, '');
      if (!username) return false;
      setFriendLoading(true);
      setFriendNotFound(false);
      try {
        await loadFriend(username);
        return true;
      } catch {
        setFriendNotFound(true);
        return false;
      } finally {
        setFriendLoading(false);
      }
    },
    [loadFriend],
  );

  // Сброс перед новым поиском: иначе экран поиска подменяется списком
  // друга, открытого в прошлый раз.
  const clearFriend = useCallback(() => {
    setFriendUsername(null);
    setFriendView(null);
    setFriendNotFound(false);
  }, []);

  const refreshFriend = useCallback(async () => {
    if (friendUsername) await loadFriend(friendUsername).catch(() => {});
  }, [friendUsername, loadFriend]);

  const toggleSubscribe = useCallback(async () => {
    if (!friendUsername || !friendView) return;
    try {
      if (friendView.subscribed) await unsubscribeFrom(friendUsername);
      else await subscribeTo(friendUsername);
    } finally {
      await refreshFriend();
    }
  }, [friendUsername, friendView, refreshFriend]);

  const sendFriendRequest = useCallback(async () => {
    if (!friendUsername) return;
    try {
      await sendFriendRequestTo(friendUsername);
    } finally {
      await refreshFriend();
    }
  }, [friendUsername, refreshFriend]);

  const addWish = useCallback(
    async (w: NewWish) => {
      await createWish({
        name: w.name,
        price: normalizePriceInput(w.price),
        url: w.url,
        description: w.description,
        visibility: w.visibility,
        allowedUserIds: w.allowedUserIds,
      });
      await reloadMy();
    },
    [reloadMy],
  );

  const updateWishById = useCallback(
    async (id: string, w: NewWish) => {
      await updateWish(id, {
        name: w.name,
        price: normalizePriceInput(w.price),
        url: w.url ?? null,
        description: w.description ?? null,
        visibility: w.visibility,
        allowedUserIds: w.allowedUserIds,
      });
      await reloadMy();
    },
    [reloadMy],
  );

  const reserve = useCallback(
    async (id: string) => {
      try {
        await reserveWish(id);
      } catch (err) {
        await refreshFriend();
        throw err;
      }
      await refreshFriend();
    },
    [refreshFriend],
  );

  const unreserve = useCallback(
    async (id: string) => {
      await unreserveWish(id).catch(() => {});
      await refreshFriend();
    },
    [refreshFriend],
  );

  const markOrdered = useCallback(
    async (id: string) => {
      await orderWish(id).catch(() => {});
      await refreshFriend();
    },
    [refreshFriend],
  );

  const markFulfilled = useCallback(
    async (id: string) => {
      await fulfillWish(id).catch(() => {});
      await reloadMy();
    },
    [reloadMy],
  );

  const friendWishes = useMemo(
    () => (friendView?.wishes ?? []).map(toWish),
    [friendView],
  );

  const value = useMemo<WishesState>(
    () => ({
      loading,
      myWishes,
      friendUsername,
      friendName:
        friendView?.owner.firstName ??
        friendView?.owner.username ??
        friendUsername ??
        '',
      friendWishes,
      friendLoading,
      friendNotFound,
      subscribedToFriend: friendView?.subscribed ?? false,
      friendRequestSent: (friendView?.friendship ?? 'NONE') !== 'NONE',
      openFriend,
      clearFriend,
      toggleSubscribe,
      sendFriendRequest,
      addWish,
      updateWish: updateWishById,
      reserve,
      unreserve,
      markOrdered,
      markFulfilled,
      find: (id) => [...myWishes, ...friendWishes].find((w) => w.id === id),
    }),
    [
      loading,
      myWishes,
      friendUsername,
      friendView,
      friendWishes,
      friendLoading,
      friendNotFound,
      openFriend,
      clearFriend,
      toggleSubscribe,
      sendFriendRequest,
      addWish,
      updateWishById,
      reserve,
      unreserve,
      markOrdered,
      markFulfilled,
    ],
  );

  return (
    <WishesContext.Provider value={value}>{children}</WishesContext.Provider>
  );
}

export function useWishes(): WishesState {
  const ctx = useContext(WishesContext);
  if (!ctx) throw new Error('useWishes outside WishesProvider');
  return ctx;
}
