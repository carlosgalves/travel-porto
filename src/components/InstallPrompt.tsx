import { useState, useEffect } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import { useTranslation } from '@/lib/i18n'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'

const STORAGE_KEY = 'pwa-install-dismissed'

function isStandalone(): boolean {
  if (typeof window === 'undefined') return true
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as { standalone?: boolean }).standalone === true
  )
}

function isIos(): boolean {
  if (typeof navigator === 'undefined') return false
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (/Mac/.test(navigator.userAgent) && navigator.maxTouchPoints > 1)
  )
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function InstallPrompt() {
  const { language } = useLanguage()
  const t = useTranslation(language)
  const [visible, setVisible] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isIOS] = useState(isIos())

  useEffect(() => {
    if (isStandalone()) return
    if (localStorage.getItem(STORAGE_KEY) === 'true') return

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setVisible(true)
    }

    if (!isIOS) {
      window.addEventListener('beforeinstallprompt', handleBeforeInstall)
      return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
    }

    setVisible(true)
  }, [])

  const handleDismiss = () => {
    localStorage.setItem(STORAGE_KEY, 'true')
    setVisible(false)
  }

  const handleInstall = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'accepted') handleDismiss()
      setDeferredPrompt(null)
    }
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div
      className="fixed inset-0 z-50 flex justify-center pt-[calc(3.5rem+env(safe-area-inset-top))] sm:pt-[calc(4rem+env(safe-area-inset-top))]"
      role="dialog"
      aria-labelledby="install-prompt-title"
      aria-modal="true"
    >
      <div
        className="absolute inset-0 bg-black/50"
        aria-hidden="true"
        onClick={handleDismiss}
      />
      <div className="relative mx-4 w-full max-w-sm rounded-xl border border-border bg-card p-4 shadow-lg">
        <button
          type="button"
          onClick={handleDismiss}
          className="absolute right-2 top-2 rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label={t('install.later')}
        >
          <X className="h-4 w-4" />
        </button>
        <h2 id="install-prompt-title" className="pr-8 text-lg font-semibold text-card-foreground">
          {t('install.title')}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {isIOS ? t('install.bodyIos') : t('install.body')}
        </p>
        <div className="mt-4 flex gap-2">
          <Button variant="outline" size="sm" onClick={handleDismiss} className="flex-1">
            {t('install.later')}
          </Button>
          {!isIOS && deferredPrompt && (
            <Button size="sm" onClick={handleInstall} className="flex-1">
              {t('install.installButton')}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
