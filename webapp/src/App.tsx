import { I18nProvider } from './i18n';
import { AuthProvider, useAuth } from './state/auth';
import { NavProvider, useNav } from './state/nav';
import { WishesProvider } from './state/wishes';
import { SocialProvider } from './state/social';
import { getStartParam } from './telegram';
import { MyWishlistScreen } from './screens/MyWishlist';
import { AddWishScreen } from './screens/AddWish';
import { FriendWishlistScreen } from './screens/FriendWishlist';
import { WishDetailScreen } from './screens/WishDetail';
import { ReserveSuccessScreen } from './screens/ReserveSuccess';
import { ProfileScreen } from './screens/Profile';
import { LoginScreen } from './screens/Login';
import { Spinner } from './ui';

function Router() {
  const { screen } = useNav();
  switch (screen.name) {
    case 'my':
      return <MyWishlistScreen />;
    case 'add':
      return <AddWishScreen />;
    case 'friend':
      return <FriendWishlistScreen username={screen.username} />;
    case 'detail':
      return <WishDetailScreen wishId={screen.wishId} context={screen.context} />;
    case 'reserved':
      return <ReserveSuccessScreen ownerName={screen.ownerName} />;
    case 'profile':
      return <ProfileScreen />;
  }
}

// Вне Telegram и без JWT — экран логина; внутри Telegram авторизует initData.
function Gate() {
  const { status } = useAuth();

  if (status === 'loading') {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <Spinner />
      </div>
    );
  }
  if (status === 'anon') return <LoginScreen />;

  const startParam = getStartParam();
  return (
    <SocialProvider>
      <WishesProvider>
        <NavProvider
          initial={
            startParam ? { name: 'friend', username: startParam } : undefined
          }
        >
          <Router />
        </NavProvider>
      </WishesProvider>
    </SocialProvider>
  );
}

export function App() {
  return (
    <I18nProvider>
      <AuthProvider>
        <div className="mx-auto min-h-dvh max-w-[480px] bg-app">
          <Gate />
        </div>
      </AuthProvider>
    </I18nProvider>
  );
}
