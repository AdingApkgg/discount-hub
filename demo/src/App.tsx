import { useMemo, useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './components/Login';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import CouponsPage from './pages/CouponsPage';
import MemberPage from './pages/MemberPage';
import ProfilePage from './pages/ProfilePage';
import ScrollDetailPage from './pages/ScrollDetailPage';
import { ToastProvider } from './contexts/ToastContext';

type Tab = 'home' | 'coupons' | 'member' | 'profile';
type Route =
  | { name: 'tabs'; tab: Tab }
  | { name: 'scroll'; id: string };

function AppContent() {
  const { user, loading } = useAuth();
  const [route, setRoute] = useState<Route>({ name: 'tabs', tab: 'home' });
  const [demo, setDemo] = useState(false);

  const currentTab: Tab = useMemo(() => {
    if (route.name === 'tabs') return route.tab;
    return 'home';
  }, [route]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--primary)]"></div>
      </div>
    );
  }

  if (!user && !demo) {
    return <Login onEnterDemo={() => setDemo(true)} />;
  }

  return (
    <ToastProvider>
      <Layout
        currentTab={currentTab}
        onTabChange={(tab) => setRoute({ name: 'tabs', tab })}
      >
        {route.name === 'tabs' && route.tab === 'home' ? (
          <HomePage
            onOpenScroll={(id) => setRoute({ name: 'scroll', id })}
            onGoMember={() => setRoute({ name: 'tabs', tab: 'member' })}
          />
        ) : null}

        {route.name === 'tabs' && route.tab === 'coupons' ? (
          <CouponsPage />
        ) : null}

        {route.name === 'tabs' && route.tab === 'member' ? (
          <MemberPage onOpenScroll={(id) => setRoute({ name: 'scroll', id })} />
        ) : null}

        {route.name === 'tabs' && route.tab === 'profile' ? (
          <ProfilePage />
        ) : null}

        {route.name === 'scroll' ? (
          <ScrollDetailPage
            scrollId={route.id}
            onBack={() => setRoute({ name: 'tabs', tab: 'home' })}
            onGoMy={() => setRoute({ name: 'tabs', tab: 'profile' })}
          />
        ) : null}
      </Layout>
    </ToastProvider>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
