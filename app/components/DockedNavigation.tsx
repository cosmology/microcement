'use client'

import { useState } from 'react'
import { Upload, FolderOpen, Settings, Users, Camera } from 'lucide-react'
import { UserRole, useUserRole } from '@/hooks/useUserRole'
import { useTranslations } from 'next-intl'
import ModelsList from './ModelsList'

interface DockedNavigationProps {
  role: UserRole
}

interface NavItem {
  icon: any
  label: string
  href: string
  onClick?: () => void
}

export default function DockedNavigation({ role }: DockedNavigationProps) {
  const [isCollapsed, setIsCollapsed] = useState(true)
  const [showModelsList, setShowModelsList] = useState(false)
  const t = useTranslations('Dock')
  const { user: userWithRole } = useUserRole()

  const navItems = (): NavItem[] => {
    switch (role) {
      case 'admin':
        return [
          { icon: Upload, label: 'Upload Models', href: '#upload' },
          { icon: FolderOpen, label: 'All Models', href: '#models' },
          { icon: Users, label: 'User Management', href: '#users' },
          { icon: Settings, label: 'System Settings', href: '#settings' }
        ]
      case 'architect':
        return [
          { icon: FolderOpen, label: 'Client Models', href: '#clients' },
          { icon: Upload, label: 'Upload Model', href: '#upload' }
        ]
      case 'end_user':
        return [
          { icon: Upload, label: 'Upload Project', href: '#upload' },
          { icon: FolderOpen, label: 'My Models', href: '#models', onClick: () => setShowModelsList(!showModelsList) }
        ]
      default:
        return []
    }
  }

  if (role === 'guest') return null

  // CameraPathEditor3D action dispatchers
  const toggleBirdView = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (typeof window !== 'undefined') {
      // Get current bird view state from ScrollScene
      const currentBirdView = (window as any).__isBirdView || false
      window.dispatchEvent(new CustomEvent('bird-view-animation', { detail: { isBirdView: !currentBirdView } }))
    }
  }
  const toggleEditor = (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    window.dispatchEvent(new CustomEvent('editor-toggle'))
  }
  const toggleLookAtTargets = (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    window.dispatchEvent(new CustomEvent('look-at-toggle'))
  }
  const toggleHeightPanel = (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    window.dispatchEvent(new CustomEvent('height-panel-toggle'))
  }
  const toggleBirdLock = (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (typeof window !== 'undefined') {
      ;(window as any).__birdViewLocked = !(window as any).__birdViewLocked
      window.dispatchEvent(new CustomEvent('bird-view-lock', { detail: { locked: (window as any).__birdViewLocked } }))
    }
  }

  return (
    <div
      className={`fixed left-0 top-0 h-screen bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 transition-all    duration-100 z-[100] ${
        isCollapsed ? 'w-12' : 'w-48'
      }`}
      onMouseEnter={() => setIsCollapsed(false)}
      onMouseLeave={() => setIsCollapsed(true)}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 border-b border-gray-200 dark:border-gray-700" style={{height: '44px'}}>
        {!isCollapsed && (
          <div className="font-semibold text-gray-900 dark:text-white text-xs whitespace-nowrap overflow-hidden">
            {role === 'admin' && t('adminPanel')}
            {role === 'architect' && t('architectPortal')}
            {role === 'end_user' && t('myProjects')}
          </div>
        )}
      </div>

      {/* Navigation Items */}
      <nav>
        <ul className="flex w-full min-w-0 flex-col gap-1">
          <div className="relative flex w-full min-w-0 flex-col p-2 gap-0.5">
            {/* Camera Controls Section - Only show for architect and admin roles */}
            {role !== 'end_user' && (
              <>
                {/* Camera Controls Header */}
                {/* <li className="group/menu-item relative border-b border-gray-300 dark:border-gray-600 pb-2 mb-1">
                  <div className="flex items-center gap-2 py-2 px-1.5 hover:bg-purple-100 dark:hover:bg-purple-900 rounded-md">
                    <div className="flex items-center justify-center shrink-0">
                      <Camera className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <span className={`${isCollapsed ? 'opacity-0 -translate-x-2 pointer-events-none' : 'opacity-100 translate-x-0'} text-xs font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap transition-[opacity,transform] duration-150`}>
                      {t('cameraControls')}
                    </span>
                  </div>
                </li> */}

                {/* Camera-related control icons (5 total) - all at same level when collapsed */}
                {/* Bird View */}
                <li className="group/menu-item relative">
                  <a onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleBirdView(e); }} className="flex w-full items-center gap-2 overflow-hidden rounded-md py-2 px-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 h-8 cursor-pointer">
                    <div className={`flex items-center justify-center shrink-0 transition-all duration-150 ${isCollapsed ? 'ml-0' : 'ml-2'}`}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-bird text-foreground dark:text-gray-200"><path d="M16 7h.01"/><path d="M3 7c9 0 9 10 18 10"/><path d="M3 7c3 3 3 6 3 10"/><path d="M7 17c6-3 6-6 11-6"/><path d="M5 7l-2 2"/></svg>
                    </div>
                    <span className={`${isCollapsed ? 'opacity-0 -translate-x-2 pointer-events-none' : 'opacity-100 translate-x-0'} text-xs whitespace-nowrap transition-[opacity,transform] duration-100`}>{t('birdView')}</span>
                  </a>
                </li>

                {/* Lock Bird View */}
                <li className="group/menu-item relative">
                  <a onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleBirdLock(e); }} className="flex w-full items-center gap-2 overflow-hidden rounded-md py-2 px-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 h-8 cursor-pointer">
                    <div className={`flex items-center justify-center shrink-0 transition-all duration-150 ${isCollapsed ? 'ml-0' : 'ml-2'}`}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-lock text-foreground dark:text-gray-200"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                    </div>
                    <span className={`${isCollapsed ? 'opacity-0 -translate-x-2 pointer-events-none' : 'opacity-100 translate-x-0'} text-xs whitespace-nowrap transition-[opacity,transform] duration-100`}>{t('lockBirdView')}</span>
                  </a>
                </li>

                {/* Editor */}
                <li className="group/menu-item relative">
                  <a onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleEditor(e); }} className="flex w-full items-center gap-2 overflow-hidden rounded-md py-2 px-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 h-8 cursor-pointer">
                    <div className={`flex items-center justify-center shrink-0 transition-all duration-150 ${isCollapsed ? 'ml-0' : 'ml-2'}`}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-tangent text-foreground dark:text-gray-200"><circle cx="12" cy="12" r="4"/><path d="M22 12h-4"/><path d="M6 12H2"/></svg>
                    </div>
                    <span className={`${isCollapsed ? 'opacity-0 -translate-x-2 pointer-events-none' : 'opacity-100 translate-x-0'} text-xs whitespace-nowrap transition-[opacity,transform] duration-100`}>{t('editor')}</span>
                  </a>
                </li>

                {/* LookAt Targets */}
                <li className="group/menu-item relative">
                  <a onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleLookAtTargets(e); }} className="flex w-full items-center gap-2 overflow-hidden rounded-md py-2 px-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 h-8 cursor-pointer">
                    <div className={`flex items-center justify-center shrink-0 transition-all duration-150 ${isCollapsed ? 'ml-0' : 'ml-6'}`}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-eye text-foreground dark:text-gray-200"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    </div>
                    <span className={`${isCollapsed ? 'opacity-0 -translate-x-2 pointer-events-none' : 'opacity-100 translate-x-0'} text-xs whitespace-nowrap transition-[opacity,transform] duration-100`}>{t('lookAtTargets')}</span>
                  </a>
                </li>

                {/* Height Panel */}
                <li className="group/menu-item relative">
                  <a onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleHeightPanel(e); }} className="flex w-full items-center gap-2 overflow-hidden rounded-md py-2 px-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 h-8 cursor-pointer">
                    <div className={`flex items-center justify-center shrink-0 transition-all duration-150 ${isCollapsed ? 'ml-0' : 'ml-6'}`}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-ruler text-foreground dark:text-gray-200"><path d="M4.5 19.5l15-15"/><path d="M12 8l1-1"/><path d="M9 11l1-1"/><path d="M7 13l1-1"/><path d="M4 16l1-1"/><path d="M14 6l1-1"/></svg>
                    </div>
                    <span className={`${isCollapsed ? 'opacity-0 -translate-x-2 pointer-events-none' : 'opacity-100 translate-x-0'} text-xs whitespace-nowrap transition-[opacity,transform] duration-100`}>{t('heightPanel')}</span>
                  </a>
                </li>

                {/* Separator after Height Panel - always visible */}
                <div className="shrink-0 bg-gray-200 dark:bg-gray-700 h-px w-[calc(100%-1rem)] mx-auto my-1" />
              </>
            )}
            {/* Existing grouped items */}
            {navItems().map((item, index) => {
              const Icon = item.icon
              return (
                <li key={`extra-${index}`} className="group/menu-item relative">
                  <a
                    href={item.href}
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      if (item.onClick) {
                        item.onClick()
                      }
                    }}
                    className="peer/menu-button flex w-full items-center gap-2 overflow-hidden rounded-md py-2 px-1.5 text-left outline-none transition-[width,height,padding] hover:bg-gray-100 dark:hover:bg-gray-800 h-8"
                  >
                    <div className="flex items-center justify-center shrink-0">
                      <Icon className="w-[19px] h-[19px] text-foreground dark:text-gray-200" />
                    </div>
                    <span className={`${isCollapsed ? 'opacity-0 -translate-x-2 pointer-events-none' : 'opacity-100 translate-x-0'} text-xs whitespace-nowrap transition-[opacity,transform]    duration-100`}>{t(item.label)}</span>
                  </a>
                </li>
              )
            })}
          </div>
        </ul>
      </nav>

      {/* Models List for end_user */}
      {role === 'end_user' && showModelsList && userWithRole && (
        <div className="absolute left-full top-0 w-80 h-full bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700 shadow-lg z-50">
          <ModelsList 
            userId={userWithRole.id} 
            onModelSelected={() => setShowModelsList(false)}
          />
        </div>
      )}

      {/* Role Badge */}
      <div
        className={`absolute bottom-4 left-4 right-4 transition-[opacity,transform]    duration-100 ${
          isCollapsed ? 'opacity-0 translate-x-[-8px] pointer-events-none' : 'opacity-100 translate-x-0'
        }`}
      >
        <div className={`px-3 py-2 rounded-lg text-xs font-medium text-center ${
          role === 'admin' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
          role === 'architect' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
          'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
        }`}>
          {role.replace('_', ' ').toUpperCase()}
        </div>
      </div>
    </div>
  )
}
