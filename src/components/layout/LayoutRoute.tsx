import { Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { AppLayout } from './AppLayout';
import { LayoutActionsProvider, useLayoutActions } from './LayoutActions';
import { PageTransition } from './PageTransition';
import { ScrollToTop } from './ScrollToTop';

function LayoutRouteInner() {
  const { actions } = useLayoutActions();
  const location = useLocation();
  return (
    <AppLayout actions={actions}>
      <ScrollToTop />
      <AnimatePresence mode="wait">
        <PageTransition key={location.pathname}>
          <Outlet />
        </PageTransition>
      </AnimatePresence>
    </AppLayout>
  );
}

export function LayoutRoute() {
  return (
    <LayoutActionsProvider>
      <LayoutRouteInner />
    </LayoutActionsProvider>
  );
}
