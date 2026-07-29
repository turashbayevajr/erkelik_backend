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
  acceptFriendRequest,
  fetchFriends,
  fetchRequests,
  fetchSubscribers,
} from '../api';
import type { ApiFriend } from '../api';
import { useAuth } from './auth';

// Друзья/заявки — /api/social; видимость по умолчанию — PATCH /api/me.

export type Visibility = 'PUBLIC' | 'FRIENDS' | 'CUSTOM';

export interface Friend {
  id: number;
  name: string;
  username: string;
}

export interface FriendRequest {
  id: number;
  name: string;
  username: string;
}

function toFriend(f: ApiFriend): Friend {
  return {
    id: f.id,
    name: f.firstName ?? f.username ?? '—',
    username: f.username ?? '',
  };
}

type SocialState = {
  friends: Friend[];
  subscribers: Friend[];
  requests: FriendRequest[];
  defaultVisibility: Visibility;
  acceptRequest: (id: number) => Promise<void>;
  setDefaultVisibility: (v: Visibility) => void;
};

const SocialContext = createContext<SocialState | null>(null);

export function SocialProvider({ children }: { children: ReactNode }) {
  const { me, updateMe } = useAuth();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [subscribers, setSubscribers] = useState<Friend[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);

  const reload = useCallback(async () => {
    const [fs, ss, rs] = await Promise.all([
      fetchFriends(),
      fetchSubscribers(),
      fetchRequests(),
    ]);
    setFriends(fs.map(toFriend));
    setSubscribers(ss.map(toFriend));
    setRequests(rs.map(toFriend));
  }, []);

  useEffect(() => {
    void reload().catch(() => {});
  }, [reload]);

  const acceptRequest = useCallback(
    async (id: number) => {
      await acceptFriendRequest(id).catch(() => {});
      await reload().catch(() => {});
    },
    [reload],
  );

  const setDefaultVisibility = useCallback(
    (v: Visibility) => {
      void updateMe({ defaultVisibility: v }).catch(() => {});
    },
    [updateMe],
  );

  const value = useMemo<SocialState>(
    () => ({
      friends,
      subscribers,
      requests,
      defaultVisibility: me?.defaultVisibility ?? 'PUBLIC',
      acceptRequest,
      setDefaultVisibility,
    }),
    [friends, subscribers, requests, me, acceptRequest, setDefaultVisibility],
  );

  return (
    <SocialContext.Provider value={value}>{children}</SocialContext.Provider>
  );
}

export function useSocial(): SocialState {
  const ctx = useContext(SocialContext);
  if (!ctx) throw new Error('useSocial outside SocialProvider');
  return ctx;
}
