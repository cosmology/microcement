'use client'

import { Settings, LogIn, UserPlus, Sparkles, Clock, Award, Palette, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTranslations } from 'next-intl'

interface NoDesignAvailableProps {
  onLoginClick?: () => void
  onSignOutClick?: () => void
  isLoggedIn?: boolean
}

export default function NoDesignAvailable({ onLoginClick, onSignOutClick, isLoggedIn = false }: NoDesignAvailableProps) {
  const t = useTranslations('NoDesignAvailable')
  
  return (
    <div
      className="fixed top-0 left-0 w-full h-full flex items-center justify-center bg-white/95 dark:bg-black/95 z-[1001]"
      style={{ pointerEvents: "none" }}
    >
      <div className="text-center text-gray-900 dark:text-white px-6 py-12 max-w-lg" style={{ pointerEvents: "auto" }}>
        {/* Subtle Brand Icon */}
        <div className="mb-8">
          <div className="relative">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-16 w-16 bg-purple-500/20 rounded-full blur-xl"></div>
            </div>
            <Sparkles className="h-16 w-16 mx-auto mb-3 text-purple-400/80 relative z-10" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-12 w-12 border border-purple-400/30 rounded-full"></div>
            </div>
          </div>
        </div>

        {/* Main Title - More Subtle */}
        <h1 className="text-3xl font-light mb-2 text-gray-900/95 dark:text-white/95 tracking-wide">
          {t('title')}
        </h1>
        
        {/* Subtitle - Softer */}
        <h2 className="text-sm font-normal mb-8 text-gray-600 dark:text-white/60 tracking-wider uppercase">
          {t('subtitle')}
        </h2>

        {/* Brand Description - Concise */}
        <p className="text-base mb-8 opacity-80 dark:opacity-80 leading-relaxed font-light text-gray-800 dark:text-white">
          {t('description')}
        </p>
        
        {/* Main Message - Minimal */}
        <p className="text-base mb-8 opacity-75 dark:opacity-75 font-light text-gray-700 dark:text-white">
          {isLoggedIn ? t('loggedInMessage') : t('notLoggedInMessage')}
        </p>
        
        {/* Subtle Features - Smaller Grid */}
        <div className="grid grid-cols-2 gap-3 mb-10">
          <div className="flex items-center gap-2 p-2 bg-gray-100/50 dark:bg-white/3 rounded-md backdrop-blur-sm relative">
            <div className="absolute inset-0 bg-purple-500/10 dark:bg-purple-500/10 rounded-md blur-sm"></div>
            <Zap className="h-4 w-4 text-purple-600 dark:text-purple-400/80 relative z-10" />
            <span className="text-xs font-light text-gray-700 dark:text-white/70 relative z-10">{t('features.latestTech')}</span>
          </div>
          <div className="flex items-center gap-2 p-2 bg-gray-100/50 dark:bg-white/3 rounded-md backdrop-blur-sm relative">
            <div className="absolute inset-0 bg-purple-500/10 dark:bg-purple-500/10 rounded-md blur-sm"></div>
            <Award className="h-4 w-4 text-purple-600 dark:text-purple-400/80 relative z-10" />
            <span className="text-xs font-light text-gray-700 dark:text-white/70 relative z-10">{t('features.sophisticatedDesign')}</span>
          </div>
          <div className="flex items-center gap-2 p-2 bg-gray-100/50 dark:bg-white/3 rounded-md backdrop-blur-sm relative">
            <div className="absolute inset-0 bg-purple-500/10 dark:bg-purple-500/10 rounded-md blur-sm"></div>
            <Clock className="h-4 w-4 text-purple-600 dark:text-purple-400/80 relative z-10" />
            <span className="text-xs font-light text-gray-700 dark:text-white/70 relative z-10">{t('features.minimalTime')}</span>
          </div>
          <div className="flex items-center gap-2 p-2 bg-gray-100/50 dark:bg-white/3 rounded-md backdrop-blur-sm relative">
            <div className="absolute inset-0 bg-purple-500/10 dark:bg-purple-500/10 rounded-md blur-sm"></div>
            <Palette className="h-4 w-4 text-purple-600 dark:text-purple-400/80 relative z-10" />
            <span className="text-xs font-light text-gray-700 dark:text-white/70 relative z-10">{t('features.premiumQuality')}</span>
          </div>
        </div>

        {/* Action Buttons - Cleaner */}
        <div className="space-y-4">
          {!isLoggedIn ? (
            <>
              <Button 
                onClick={onLoginClick}
                className="w-full bg-gray-200/80 hover:bg-gray-300/80 dark:bg-white/10 dark:hover:bg-white/20 text-gray-800 dark:text-white font-light py-3 px-8 rounded-md border border-gray-300/50 hover:border-gray-400/50 dark:border-white/20 dark:hover:border-white/30 transition-all duration-300 backdrop-blur-sm relative"
                size="lg"
              >
                <div className="absolute inset-0 bg-purple-500/5 dark:bg-purple-500/5 rounded-md blur-sm"></div>
                <LogIn className="h-4 w-4 mr-2 relative z-10" />
                <span className="relative z-10">{t('signInButton')}</span>
              </Button>
              
              <p className="text-xs opacity-60 dark:opacity-60 font-light text-gray-600 dark:text-white">
                {t('signUpPrompt')}
              </p>
            </>
          ) : (
            <div className="text-center">
              <p className="text-sm opacity-70 dark:opacity-70 mb-4 font-light text-gray-700 dark:text-white">
                {t('loggedInPrompt')}
              </p>
              <p className="text-xs opacity-50 dark:opacity-50 mb-6 font-light text-gray-600 dark:text-white">
                {t('contactPrompt')}
              </p>
              {onSignOutClick && (
                <Button 
                  onClick={onSignOutClick}
                  className="w-full bg-gray-200/50 hover:bg-gray-300/50 dark:bg-white/5 dark:hover:bg-white/10 text-gray-700 dark:text-white/80 font-light py-3 px-8 rounded-md border border-gray-300/30 hover:border-gray-400/30 dark:border-white/10 dark:hover:border-white/20 transition-all duration-300 backdrop-blur-sm relative"
                  size="lg"
                >
                  <div className="absolute inset-0 bg-purple-500/5 dark:bg-purple-500/5 rounded-md blur-sm"></div>
                  <LogIn className="h-4 w-4 mr-2 relative z-10" />
                  <span className="relative z-10">{t('signOutButton')}</span>
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Minimal Brand Footer */}
        <div className="mt-12 pt-6 border-t border-gray-300/20 dark:border-white/5">
          <p className="text-xs opacity-30 dark:opacity-30 font-light tracking-wider text-gray-500 dark:text-white">
            Premium Interior Design
          </p>
        </div>
      </div>
    </div>
  )
}
