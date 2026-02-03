import enTranslations from '../locales/en.json';
import ptTranslations from '../locales/pt.json';
import type { Language } from '../contexts/LanguageContext';
import { useCallback } from 'react';

type TranslationKey = 
  | 'app.title'
  | 'header.toggleTheme'
  | 'header.light'
  | 'header.dark'
  | 'map.loading'
  | 'map.gettingLocation'
  | 'map.unableToLoad'
  | 'busStop.title'
  | 'busStop.arrivalNow'
  | 'busStop.linesAtThisStop'
  | 'busStop.nextArrivals'
  | 'busStop.scheduledArrivals'
  | 'busStop.scheduledArrivalsLabel'
  | 'busStop.loadingScheduledArrivals'
  | 'busStop.noScheduledArrivals'
  | 'busStop.scheduledArrivalsError'
  | 'busStop.saveStop'
  | 'busStop.unsaveStop'
  | 'busStop.close'
  | 'menu.settings'
  | 'menu.savedStops'
  | 'menu.searchSavedStops'
  | 'menu.filterByRoute'
  | 'menu.filterByRouteDescription'
  | 'menu.filterSearchRoutes'
  | 'menu.filterEnableAll'
  | 'menu.filterDisableAll'
  | 'menu.clearSearch'
  | 'menu.noSavedStops'
  | 'menu.noSearchResults'
  | 'menu.theme'
  | 'menu.language'
  | 'menu.portuguese'
  | 'menu.english'
  | 'nav.back'
  | 'nav.savedStops'
  | 'nav.routes'
  | 'nav.settings'
  | 'routes.loading'
  | 'routes.loadError'
  | 'routes.noRoutes'
  | 'routes.selectDirection'
  | 'routes.stopsLabel'
  | 'routes.loadingStops'
  | 'routes.noStops'
  | 'errors.locationError'
  | 'errors.geolocationNotSupported'
  | 'errors.noInternetConnection';

const translations: Record<Language, typeof enTranslations> = {
  en: enTranslations,
  pt: ptTranslations,
};

export function getTranslation(language: Language, key: TranslationKey, params?: Record<string, string>): string {
  const keys = key.split('.');
  let value: any = translations[language];
  
  for (const k of keys) {
    value = value?.[k];
  }
  
  if (typeof value !== 'string') {
    // Fallback to Portuguese if translation is missing
    let fallbackValue: any = translations.pt;
    for (const k of keys) {
      fallbackValue = fallbackValue?.[k];
    }
    value = fallbackValue || key;
  }
  
  // Replace placeholders
  if (params && typeof value === 'string') {
    return value.replace(/\{(\w+)\}/g, (match, paramKey) => {
      return params[paramKey] || match;
    });
  }
  
  return value || key;
}

export function useTranslation(language: Language) {
  return useCallback(
    (key: TranslationKey, params?: Record<string, string>) => getTranslation(language, key, params),
    [language]
  );
}
