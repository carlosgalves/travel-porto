import type { MobileTab } from '../components/BottomNav';

const PATHS: Record<MobileTab, string> = {
  map: '/',
  saved: '/saved',
  settings: '/settings',
};

export function pathnameToTab(pathname: string): MobileTab {
  if (pathname === '/saved') return 'saved';
  if (pathname === '/settings') return 'settings';
  return 'map';
}

export function tabToPathname(tab: MobileTab): string {
  return PATHS[tab];
}

export function pushPath(tab: MobileTab, search = window.location.search): void {
  const path = tabToPathname(tab) + search;
  window.history.pushState({}, '', path);
}
