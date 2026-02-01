import { useState, useMemo } from 'react';
import { Search, X } from 'lucide-react';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import { useMapContext } from '../../contexts/MapContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTranslation } from '../../lib/i18n';
import { filterStopsByQuery } from '../../lib/search';
import type { BusStop } from '../../api/types';

function openStopInUrl(stop: BusStop) {
  const url = new URL(window.location.href);
  url.searchParams.set('stop', stop.id);
  window.history.pushState({}, '', url.pathname + url.search);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

export interface SavedStopsViewProps {
  onSelectStop?: (stop: BusStop) => void;
}

export function SavedStopsView({ onSelectStop }: SavedStopsViewProps = {}) {
  const { language } = useLanguage();
  const t = useTranslation(language);
  const { savedStops, removeSavedStop } = useMapContext();
  const [search, setSearch] = useState('');

  const handleSelectStop = (stop: BusStop) => {
    if (onSelectStop) {
      onSelectStop(stop);
    } else {
      openStopInUrl(stop);
    }
  };

  const filteredStops = useMemo(() => {
    const q = search.trim();
    if (!q) return savedStops;
    return filterStopsByQuery(savedStops, q);
  }, [savedStops, search]);

  return (
    <div className="flex h-full flex-col overflow-hidden bg-background">
      <div className="shrink-0 px-4 pb-3 pt-4">
        <div className="relative flex w-full items-center">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 shrink-0 text-muted-foreground pointer-events-none" aria-hidden />
          <input
            type="text"
            inputMode="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('menu.searchSavedStops')}
            className="w-full rounded-md border border-input bg-background py-2 pl-8 pr-8 text-base outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
          />
          {search.trim() !== '' && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-0 h-8 w-8 shrink-0"
              onClick={() => setSearch('')}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
      <ScrollArea className="min-h-0 flex-1 px-4">
        {savedStops.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            {t('menu.noSavedStops')}
          </p>
        ) : filteredStops.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            {t('menu.noSearchResults')}
          </p>
        ) : (
          <ul className="space-y-1 pb-6">
            {filteredStops.map((stop) => (
              <li key={stop.id}>
                <div
                  className="flex cursor-pointer items-center gap-2 rounded-md border border-border bg-card px-3 py-2.5 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  role="button"
                  tabIndex={0}
                  onClick={() => handleSelectStop(stop)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleSelectStop(stop);
                    }
                  }}
                >
                  <span className="min-w-0 flex-1 truncate font-medium">{stop.name}</span>
                  <span className="shrink-0 text-muted-foreground text-xs">{stop.id}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      removeSavedStop(stop.id);
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </ScrollArea>
    </div>
  );
}