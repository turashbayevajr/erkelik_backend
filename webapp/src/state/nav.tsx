import { createContext, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

export type Screen =
  | { name: 'my' }
  | { name: 'add' }
  | { name: 'friend'; username?: string }
  | { name: 'detail'; wishId: string; context: 'owner' | 'giver' }
  | { name: 'reserved'; ownerName: string }
  | { name: 'profile' };

type Nav = {
  screen: Screen;
  push: (s: Screen) => void;
  replace: (s: Screen) => void;
  back: () => void;
  canGoBack: boolean;
};

const NavContext = createContext<Nav | null>(null);

export function NavProvider({
  children,
  initial,
}: {
  children: ReactNode;
  initial?: Screen;
}) {
  const [stack, setStack] = useState<Screen[]>(
    initial && initial.name !== 'my'
      ? [{ name: 'my' }, initial]
      : [{ name: 'my' }],
  );

  const value = useMemo<Nav>(
    () => ({
      screen: stack[stack.length - 1],
      push: (s) => setStack((st) => [...st, s]),
      replace: (s) => setStack((st) => [...st.slice(0, -1), s]),
      back: () => setStack((st) => (st.length > 1 ? st.slice(0, -1) : st)),
      canGoBack: stack.length > 1,
    }),
    [stack],
  );

  return <NavContext.Provider value={value}>{children}</NavContext.Provider>;
}

export function useNav(): Nav {
  const ctx = useContext(NavContext);
  if (!ctx) throw new Error('useNav outside NavProvider');
  return ctx;
}
