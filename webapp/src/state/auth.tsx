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
  apiLogin,
  clearToken,
  fetchMe,
  hasAuth,
  patchMe,
  setUnauthorizedHandler,
} from '../api';
import type { ApiLocale, ApiUser, ApiVisibility } from '../api';
import { savedLocale, useI18n } from '../i18n';

type AuthStatus = 'loading' | 'authed' | 'anon';

type AuthState = {
  status: AuthStatus;
  me: ApiUser | null;
  login: (login: string, password: string) => Promise<boolean>;
  logout: () => void;
  updateMe: (patch: {
    preferredLocale?: ApiLocale;
    defaultVisibility?: ApiVisibility;
  }) => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [me, setMe] = useState<ApiUser | null>(null);
  const { applyLocale } = useI18n();

  // Язык пользователя живёт на сервере (бот и уведомления берут его оттуда).
  // Выбор, сделанный на этом устройстве, досылаем, если сервер его не знает;
  // иначе показываем серверный язык.
  const adoptUser = useCallback(
    (user: ApiUser) => {
      setMe(user);
      const saved = savedLocale();
      if (saved && saved !== user.preferredLocale) {
        void patchMe({ preferredLocale: saved })
          .then(setMe)
          .catch(() => {});
        return;
      }
      applyLocale(user.preferredLocale);
    },
    [applyLocale],
  );

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setMe(null);
      setStatus('anon');
    });
    return () => setUnauthorizedHandler(null);
  }, []);

  useEffect(() => {
    if (!hasAuth()) {
      setStatus('anon');
      return;
    }
    fetchMe()
      .then((user) => {
        adoptUser(user);
        setStatus('authed');
      })
      .catch(() => {
        // 401 уже обработан хендлером; прочее — считаем не залогиненным
        setStatus((s) => (s === 'loading' ? 'anon' : s));
      });
  }, [adoptUser]);

  const login = useCallback(async (loginValue: string, password: string) => {
    try {
      const user = await apiLogin(loginValue, password);
      adoptUser(user);
      setStatus('authed');
      return true;
    } catch {
      return false;
    }
  }, [adoptUser]);

  const logout = useCallback(() => {
    clearToken();
    setMe(null);
    setStatus('anon');
  }, []);

  const updateMe = useCallback(
    async (patch: {
      preferredLocale?: ApiLocale;
      defaultVisibility?: ApiVisibility;
    }) => {
      const user = await patchMe(patch);
      setMe(user);
    },
    [],
  );

  const value = useMemo<AuthState>(
    () => ({ status, me, login, logout, updateMe }),
    [status, me, login, logout, updateMe],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth outside AuthProvider');
  return ctx;
}
