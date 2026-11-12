import { getInitDataRaw } from './telegram';

// Единственное место, где webapp ходит в бэкенд. Выбор авторизации —
// жёсткий приоритет: есть initData → всегда `tma` (JWT игнорируется);
// иначе Bearer, если токен есть; иначе без заголовка → 401 → логин.

const BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? '';
const TOKEN_KEY = 'jwt';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(cb: (() => void) | null): void {
  onUnauthorized = cb;
}

export function hasAuth(): boolean {
  return Boolean(getInitDataRaw() || getToken());
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {};
  // FormData (загрузка фото) сама выставляет multipart с boundary.
  if (init?.body && !(init.body instanceof FormData))
    headers['Content-Type'] = 'application/json';

  const initData = getInitDataRaw();
  if (initData) headers.Authorization = `tma ${initData}`;
  else {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE}${path}`, { ...init, headers });
  if (res.status === 401) {
    clearToken();
    onUnauthorized?.();
    throw new ApiError(401, 'Unauthorized');
  }
  if (!res.ok) {
    let message = res.statusText;
    try {
      const body = (await res.json()) as { message?: string | string[] };
      if (body.message)
        message = Array.isArray(body.message)
          ? body.message.join(', ')
          : body.message;
    } catch {
      // тело не JSON — оставляем statusText
    }
    throw new ApiError(res.status, message);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

// --------- Типы ответов ---------

export type ApiVisibility = 'PUBLIC' | 'FRIENDS' | 'CUSTOM';
export type ApiStatus = 'OPEN' | 'RESERVED' | 'ORDERED' | 'FULFILLED';
export type ApiLocale = 'RU' | 'KK' | 'EN';

export interface ApiUser {
  id: number;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  preferredLocale: ApiLocale;
  defaultVisibility: ApiVisibility;
}

export interface ApiImage {
  key: string;
  /** Путь от корня API, например /api/media/<key>. */
  url: string;
  width: number;
  height: number;
}

export interface ApiWish {
  id: string;
  name: string;
  price: string | null;
  url: string | null;
  description: string | null;
  images: ApiImage[];
  status: ApiStatus;
  visibility?: ApiVisibility;
  reservedByMe?: boolean;
}

export interface ApiFriendView {
  owner: { id: number; username: string | null; firstName: string | null };
  subscribed: boolean;
  friendship: 'NONE' | 'FRIENDS' | 'PENDING_OUT' | 'PENDING_IN';
  wishes: ApiWish[];
}

export interface ApiFriend {
  id: number;
  username: string | null;
  firstName: string | null;
}

// --------- Вызовы ---------

export async function apiLogin(
  login: string,
  password: string,
): Promise<ApiUser> {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ login, password }),
  });
  if (!res.ok) throw new ApiError(res.status, 'Invalid credentials');
  const data = (await res.json()) as { token: string; user: ApiUser };
  localStorage.setItem(TOKEN_KEY, data.token);
  return data.user;
}

export const fetchMe = () => request<ApiUser>('/api/me');

export const patchMe = (patch: {
  preferredLocale?: ApiLocale;
  defaultVisibility?: ApiVisibility;
}) =>
  request<ApiUser>('/api/me', { method: 'PATCH', body: JSON.stringify(patch) });

export const fetchMyWishes = () => request<ApiWish[]>('/api/wishes');

export const createWish = (wish: {
  name: string;
  price?: string;
  url?: string;
  description?: string;
  visibility?: ApiVisibility;
  allowedUserIds?: number[];
  imageKeys?: string[];
}) =>
  request<ApiWish>('/api/wishes', {
    method: 'POST',
    body: JSON.stringify(wish),
  });

export const updateWish = (
  id: string,
  patch: {
    name?: string;
    price?: string | null;
    url?: string | null;
    description?: string | null;
    visibility?: ApiVisibility;
    allowedUserIds?: number[];
    /** Новый набор фото целиком; не передан — фото не меняются. */
    imageKeys?: string[];
  },
) =>
  request<ApiWish>(`/api/wishes/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });

/** Абсолютный адрес картинки с учётом VITE_API_URL. */
export const mediaSrc = (path: string) => `${BASE}${path}`;

export function uploadImage(file: File): Promise<ApiImage> {
  const body = new FormData();
  body.append('file', file);
  return request<ApiImage>('/api/media', { method: 'POST', body });
}

export const deleteWish = (id: string) =>
  request<void>(`/api/wishes/${id}`, { method: 'DELETE' });

export const fulfillWish = (id: string) =>
  request<ApiWish>(`/api/wishes/${id}/fulfilled`, { method: 'POST' });

export const reserveWish = (id: string) =>
  request<ApiWish>(`/api/wishes/${id}/reserve`, { method: 'POST' });

export const unreserveWish = (id: string) =>
  request<ApiWish>(`/api/wishes/${id}/unreserve`, { method: 'POST' });

export const orderWish = (id: string) =>
  request<ApiWish>(`/api/wishes/${id}/ordered`, { method: 'POST' });

export const fetchFriendView = (username: string) =>
  request<ApiFriendView>(
    `/api/users/${encodeURIComponent(username)}/wishes`,
  );

export const fetchFriends = () => request<ApiFriend[]>('/api/social/friends');

export const fetchSubscribers = () =>
  request<ApiFriend[]>('/api/social/subscribers');

export const fetchRequests = () =>
  request<ApiFriend[]>('/api/social/requests');

export const acceptFriendRequest = (id: number) =>
  request<{ message: string }>(`/api/social/requests/${id}/accept`, {
    method: 'POST',
  });

export const subscribeTo = (username: string) =>
  request<{ message: string }>(
    `/api/social/subscriptions/${encodeURIComponent(username)}`,
    { method: 'POST' },
  );

export const unsubscribeFrom = (username: string) =>
  request<{ message: string }>(
    `/api/social/subscriptions/${encodeURIComponent(username)}`,
    { method: 'DELETE' },
  );

export const sendFriendRequestTo = (username: string) =>
  request<{ message: string }>(
    `/api/social/friend-requests/${encodeURIComponent(username)}`,
    { method: 'POST' },
  );
