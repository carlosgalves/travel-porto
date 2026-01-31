import { Moon, Sun, Check } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTranslation } from '../../lib/i18n';
import { cn } from '@/lib/utils';


export function SettingsView() {
  const { language: lang, setLanguage } = useLanguage();
  const t = useTranslation(lang);
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex h-full flex-col overflow-auto bg-background px-4 pt-4 pb-6">
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">{t('menu.theme')}</h2>
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
        <h2 className="text-sm font-semibold text-foreground">{t('menu.language')}</h2>
        <div className="flex flex-col gap-1 rounded-lg border border-border bg-card p-1">
          <button
            type="button"
            onClick={() => setLanguage('pt')}
            className={cn(
              'flex items-center justify-between rounded-md px-3 py-2.5 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              lang === 'pt' && 'bg-accent/50'
            )}
          >
            <span>{t('menu.portuguese')}</span>
            {lang === 'pt' && <Check className="h-4 w-4 shrink-0" aria-hidden />}
          </button>
          <button
            type="button"
            onClick={() => setLanguage('en')}
            className={cn(
              'flex items-center justify-between rounded-md px-3 py-2.5 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              lang === 'en' && 'bg-accent/50'
            )}
          >
            <span>{t('menu.english')}</span>
            {lang === 'en' && <Check className="h-4 w-4 shrink-0" aria-hidden />}
          </button>
        </div>
      </section>
    </div>
  );
}