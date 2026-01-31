import { Moon, Sun, Locate, LocateFixed, LocateOff, Settings, Check, Bookmark, X } from 'lucide-react';
import { Button } from './ui/button';
import { useTheme } from '../contexts/ThemeContext';
import { useMapContext } from '../contexts/MapContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useTranslation } from '../lib/i18n';
import { centerMap } from '../lib/map';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from './ui/dropdown-menu';
import type { BusStop } from '../api/types';

export default function Header() {
  const { theme, setTheme } = useTheme();
  const { language, setLanguage } = useLanguage();
  const t = useTranslation(language);
  const { mapInstance, userPosition, hasLocationPermission, isCenteredOnUser, setIsCenteredOnUser, savedStops, removeSavedStop } = useMapContext();

  const openSavedStop = (stop: BusStop) => {
    const url = new URL(window.location.href);
    url.searchParams.set('stop', stop.id);
    window.history.pushState({}, '', url.pathname + url.search);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  const handleReCenter = () => {
    if (mapInstance && userPosition) {
      centerMap(mapInstance, userPosition);
      setIsCenteredOnUser(true);
    }
  };

  const getLocationIcon = () => {
    if (!hasLocationPermission) {
      return <LocateOff className="h-5 w-5" />;
    }
    if (isCenteredOnUser) {
      return <LocateFixed className="h-5 w-5" />;
    }
    return <Locate className="h-5 w-5" />;
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-[100] bg-background/80 backdrop-blur-sm border-b border-border shadow-sm">
      <div className="flex items-center justify-between h-14 px-4">
        <div className="flex items-center">
          <h1 className="text-lg font-semibold">{t('app.title')}</h1>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu
            trigger={
              <Button
                variant="ghost"
                size="icon"
                aria-label={t('menu.savedStops')}
              >
                <Bookmark className="h-5 w-5" />
              </Button>
            }
            align="right"
          >
            <DropdownMenuContent>
              <DropdownMenuLabel>{t('menu.savedStops')}</DropdownMenuLabel>
              {savedStops.length === 0 ? (
                <DropdownMenuItem disabled>
                  {t('menu.noSavedStops')}
                </DropdownMenuItem>
              ) : (
                savedStops.map((stop) => (
                  <DropdownMenuItem
                    key={stop.id}
                    onClick={() => openSavedStop(stop)}
                    className="flex items-center gap-2"
                  >
                    <span className="min-w-0 flex-1 truncate">{stop.name}</span>
                    <span className="shrink-0 text-muted-foreground text-xs">
                      {stop.id}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0"
                      aria-label={t('busStop.unsaveStop')}
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        removeSavedStop(stop.id);
                      }}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          {(userPosition || !hasLocationPermission) && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleReCenter}
              disabled={!hasLocationPermission || !userPosition}
            >
              {getLocationIcon()}
            </Button>
          )}
          <DropdownMenu
            trigger={
              <Button
                variant="ghost"
                size="icon"
                aria-label={t('menu.settings')}
              >
                <Settings className="h-5 w-5" />
              </Button>
            }
            align="right"
          >
            <DropdownMenuContent>
              <DropdownMenuLabel>{t('menu.theme')}</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => setTheme('light')}>
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    <Sun className="h-4 w-4" />
                    <span>{t('header.light')}</span>
                  </div>
                  {theme === 'light' && <Check className="h-4 w-4" />}
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme('dark')}>
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    <Moon className="h-4 w-4" />
                    <span>{t('header.dark')}</span>
                  </div>
                  {theme === 'dark' && <Check className="h-4 w-4" />}
                </div>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>{t('menu.language')}</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => setLanguage('pt')}>
                <div className="flex items-center justify-between w-full">
                  <span>{t('menu.portuguese')}</span>
                  {language === 'pt' && <Check className="h-4 w-4" />}
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLanguage('en')}>
                <div className="flex items-center justify-between w-full">
                  <span>{t('menu.english')}</span>
                  {language === 'en' && <Check className="h-4 w-4" />}
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
