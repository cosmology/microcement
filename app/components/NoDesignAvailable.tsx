'use client'

import { LogIn } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTranslations } from 'next-intl'
import Image from 'next/image'

interface NoDesignAvailableProps {
  onLoginClick?: () => void
  onSignOutClick?: () => void
  isLoggedIn?: boolean
}

export default function NoDesignAvailable({ onLoginClick, onSignOutClick, isLoggedIn = false }: NoDesignAvailableProps) {
  const t = useTranslations('NoDesignAvailable')
  
  return (
    <div
      className="fixed top-0 left-0 w-full h-full flex items-center justify-center bg-white dark:bg-gray-900 z-[1001]"
      style={{ pointerEvents: "none" }}
    >
      <div className="text-center px-6 py-12 max-w-2xl" style={{ pointerEvents: "auto" }}>
        {/* Logo - 200px width, centered, toned down like DockedNavigation borders */}
        <div className="mb-8 flex justify-center">
          <div className="relative" style={{ width: '200px' }}>
            <Image
              src="/images/logo-procemento.png"
              alt="ProCemento Logo"
              width={200}
              height={200}
              className="w-full h-auto object-contain opacity-30 dark:opacity-20"
            />
          </div>
        </div>

        {/* Main Message - Subtle */}
        <p className="text-sm mb-8 text-gray-600 dark:text-gray-400 font-light">
          {isLoggedIn ? t('loggedInMessage') : t('notLoggedInMessage')}
        </p>

        {/* Action Buttons - Match DockedNavigation role badge background */}
        <div className="space-y-4">
          {!isLoggedIn ? (
            <>
              <Button 
                onClick={onLoginClick}
                className="bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium py-2 px-6 rounded-lg border border-gray-200 dark:border-gray-700 transition-colors"
                size="sm"
              >
                <LogIn className="h-4 w-4 mr-2" />
                <span>{t('signInButton')}</span>
              </Button>
              
              <p className="text-xs text-gray-500 dark:text-gray-500 font-light">
                {t('signUpPrompt')}
              </p>
            </>
          ) : (
            <div className="text-center">
              <p className="text-sm mb-4 text-gray-600 dark:text-gray-400 font-light">
                {t('loggedInPrompt')}
              </p>
              <p className="text-xs mb-6 text-gray-500 dark:text-gray-500 font-light">
                {t('contactPrompt')}
              </p>
              {onSignOutClick && (
                <Button 
                  onClick={onSignOutClick}
                  className="bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium py-2 px-6 rounded-lg border border-gray-200 dark:border-gray-700 transition-colors"
                  size="sm"
                >
                  <LogIn className="h-4 w-4 mr-2" />
                  <span>{t('signOutButton')}</span>
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
