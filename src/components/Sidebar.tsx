import { useState, useMemo } from 'react';
import { Map, Bookmark, Settings, Route, ChevronLeft, X, Moon, Sun, Check, Search } from 'lucide-react';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { useMapContext } from '../contexts/MapContext';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useTranslation } from '../lib/i18n';
import { filterStopsByQuery } from '../lib/search';
import { cn } from '@/lib/utils';
import type { BusStop } from '../api/types';
import { RoutesView } from './mobile/RoutesView';

export type SidebarPanel = 'map' | 'saved' | 'settings' | 'routes';

type SidebarView = 'menu' | 'saved' | 'settings' | 'routes';

function openStop(stop: BusStop) {
  const url = new URL(window.location.href);
  url.searchParams.set('stop', stop.id);
  window.history.pushState({}, '', url.pathname + url.search);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

const MENU_ITEMS: { id: SidebarPanel; icon: typeof Map }[] = [
  { id: 'map', icon: Map },
  { id: 'saved', icon: Bookmark },
  { id: 'routes', icon: Route },
  { id: 'settings', icon: Settings },
];

export function Sidebar() {
  const [view, setView] = useState<SidebarView>('menu');
  const { language, setLanguage } = useLanguage();
  const t = useTranslation(language);
  const { theme, setTheme } = useTheme();
  const { savedStops, removeSavedStop } = useMapContext();
  const [savedStopsSearch, setSavedStopsSearch] = useState('');

  const filteredSavedStops = useMemo(() => {
    const q = savedStopsSearch.trim();
    if (!q) return savedStops;
    return filterStopsByQuery(savedStops, q);
  }, [savedStops, savedStopsSearch]);

  const handleMenuClick = (id: SidebarPanel) => {
    if (id === 'map') return; // Map is main area, no sidebar content
    setView(id);
  };

  const isExpanded = view === 'saved' || view === 'settings' || view === 'routes';

  return (
    <aside
      className={cn(
        'hidden md:flex md:shrink-0 md:flex-col md:border-l md:border-border md:bg-background md:transition-[width] md:duration-200 md:ease-out',
        isExpanded ? 'md:w-80' : 'md:w-14'
      )}
    >
      {view === 'menu' && (
        <nav className="flex flex-col gap-0.5 p-2">
          {MENU_ITEMS.map(({ id, icon: Icon }) => {
            const isMapSelected = id === 'map';
            return (
              <Button
                key={id}
                variant="ghost"
                size="icon"
                className={cn(
                  'h-10 w-10 shrink-0 text-muted-foreground',
                  isMapSelected && 'bg-accent text-accent-foreground'
                )}
                onClick={() => handleMenuClick(id)}
                aria-current={isMapSelected ? 'page' : undefined}
              >
                <Icon className="h-5 w-5 shrink-0" aria-hidden />
              </Button>
            );
          })}
        </nav>
      )}

      {(view === 'saved' || view === 'settings' || view === 'routes') && (
        <>
          <header className="flex shrink-0 items-center gap-2 border-b border-border px-2 py-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={() => setView('menu')}
            >
              <ChevronLeft className="h-5 w-5" aria-hidden />
            </Button>
            <h2 className="min-w-0 flex-1 break-words text-sm font-semibold">
              {view === 'saved' ? t('nav.savedStops') : view === 'routes' ? t('nav.routes') : t('nav.settings')}
            </h2>
          </header>
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            {view === 'routes' && (
              <RoutesView />
            )}
            {view === 'saved' && (
              <>
                <div className="shrink-0 p-3">
                  <div className="relative flex w-full items-center">
                    <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 shrink-0 text-muted-foreground pointer-events-none" aria-hidden />
                    <input
                      type="text"
                      inputMode="search"
                      value={savedStopsSearch}
                      onChange={(e) => setSavedStopsSearch(e.target.value)}
                      placeholder={t('menu.searchSavedStops')}
                      className="w-full rounded-md border border-input bg-background py-2 pl-8 pr-8 text-base outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
                    />
                    {savedStopsSearch.trim() !== '' && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 h-8 w-8 shrink-0"
                        onClick={() => setSavedStopsSearch('')}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
                <ScrollArea className="min-h-0 flex-1 px-3 pb-3">
                  {savedStops.length === 0 ? (
                    <p className="py-6 text-center text-sm text-muted-foreground">{t('menu.noSavedStops')}</p>
                  ) : filteredSavedStops.length === 0 ? (
                    <p className="py-6 text-center text-sm text-muted-foreground">{t('menu.noSearchResults')}</p>
                  ) : (
                    <ul className="space-y-1 pb-4">
                      {filteredSavedStops.map((stop) => (
                        <li key={stop.id}>
                          <div
                            className="flex cursor-pointer items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            role="button"
                            tabIndex={0}
                            onClick={() => openStop(stop)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                openStop(stop);
                              }
                            }}
                          >
                            <span className="min-w-0 flex-1 break-words font-medium">{stop.name}</span>
                            <span className="shrink-0 text-muted-foreground text-xs">{stop.id}</span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 shrink-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                removeSavedStop(stop.id);
                              }}
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </ScrollArea>
              </>
            )}
            {view === 'settings' && (
              <div className="flex-1 overflow-auto p-4">
                <section className="space-y-3">
                  <h3 className="text-sm font-semibold text-foreground">{t('menu.theme')}</h3>
                  <div className="flex flex-col gap-1 rounded-lg border border-border bg-card p-1">
                    <button
                      type="button"
                      onClick={() => setTheme('light')}
                      className={cn(
                        'flex items-center justify-between rounded-md px-3 py-2.5 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                        theme === 'light' && 'bg-accent/50'
                      )}
                    >
                      <span className="flex items-center gap-2">
                        <Sun className="h-4 w-4" aria-hidden />
                        <span>{t('header.light')}</span>
                      </span>
                      {theme === 'light' && <Check className="h-4 w-4 shrink-0" aria-hidden />}
                    </button>
                    <button
                      type="button"
                      onClick={() => setTheme('dark')}
                      className={cn(
                        'flex items-center justify-between rounded-md px-3 py-2.5 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                        theme === 'dark' && 'bg-accent/50'
                      )}
                    >
                      <span className="flex items-center gap-2">
                        <Moon className="h-4 w-4" aria-hidden />
                        <span>{t('header.dark')}</span>
                      </span>
                      {theme === 'dark' && <Check className="h-4 w-4 shrink-0" aria-hidden />}
                    </button>
                  </div>
                </section>
                <section className="mt-8 space-y-3">
                  <h3 className="text-sm font-semibold text-foreground">{t('menu.language')}</h3>
                  <div className="flex flex-col gap-1 rounded-lg border border-border bg-card p-1">
                    <button
                      type="button"
                      onClick={() => setLanguage('pt')}
                      className={cn(
                        'flex items-center justify-between rounded-md px-3 py-2.5 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                        language === 'pt' && 'bg-accent/50'
                      )}
                    >
                      <span>{t('menu.portuguese')}</span>
                      {language === 'pt' && <Check className="h-4 w-4 shrink-0" aria-hidden />}
                    </button>
                    <button
                      type="button"
                      onClick={() => setLanguage('en')}
                      className={cn(
                        'flex items-center justify-between rounded-md px-3 py-2.5 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                        language === 'en' && 'bg-accent/50'
                      )}
                    >
                      <span>{t('menu.english')}</span>
                      {language === 'en' && <Check className="h-4 w-4 shrink-0" aria-hidden />}
                    </button>
                  </div>
                </section>
              </div>
            )}
          </div>
        </>
      )}
    </aside>
  );
}
