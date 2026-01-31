import { Map, Bookmark, Settings } from 'lucide-react';
import { Button } from './ui/button';
import { useTranslation } from '../lib/i18n';
import { useLanguage } from '../contexts/LanguageContext';
import { cn } from '@/lib/utils';

export type MobileTab = 'map' | 'saved' | 'settings';

interface BottomNavProps {
  activeTab: MobileTab;
  onTabChange: (tab: MobileTab) => void;
}

const TABS: { id: MobileTab; icon: typeof Map; labelKey: 'nav.map' | 'nav.savedStops' | 'nav.settings' }[] = [
  { id: 'map', icon: Map, labelKey: 'nav.map' },
  { id: 'saved', icon: Bookmark, labelKey: 'nav.savedStops' },
  { id: 'settings', icon: Settings, labelKey: 'nav.settings' },
];

export function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  const { language } = useLanguage();
  const t = useTranslation(language);

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-[250] flex items-center justify-around border-t border-border bg-background/95 backdrop-blur-sm pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      {TABS.map(({ id, icon: Icon, labelKey }) => (
        <Button
          key={id}
          variant="ghost"
          size="sm"
          className={cn(
            'flex flex-col gap-0.5 h-auto py-3 px-4 rounded-none min-w-0 flex-1 text-muted-foreground',
            activeTab === id && 'text-primary bg-accent/50'
          )}
          onClick={() => onTabChange(id)}
          aria-current={activeTab === id ? 'page' : undefined}
        >
          <Icon className="h-5 w-5 shrink-0" />
          <span className="text-xs font-medium"></span>
        </Button>
      ))}
    </nav>
  );
}