'use client'

import React from 'react'
import { Upload, FileStack, Settings, Users, Trash2, RotateCw, PanelLeftClose, Boxes, Camera } from 'lucide-react'
import { UserRole } from '@/hooks/useUserRole'
import { useTranslations } from 'next-intl'
import { useDockedNavigationStore } from '@/lib/stores/dockedNavigationStore'
import { useCameraStore } from '@/lib/stores/cameraStore'
import ModelsList from './ModelsList'
import { ArchitectModelsList } from './ArchitectModelsList'
import ProjectBriefModal from './ProjectBriefModal'
import UploadsList from './UploadsList'
import CameraPathEditor3D from './CameraPathEditor3D'

// UI Constants
const SUBPANEL_WIDTH = 'w-[21rem]' // 800px uniform width for all subpanels
6
interface DockedNavigationProps {
  role: UserRole
}

interface NavItem {
  icon: any
  label: string
  href: string
  onClick?: () => void
}

export default function DockedNavigation({ role, userWithRole }: DockedNavigationProps & { userWithRole?: any }) {
  const t = useTranslations('Dock')
  
  // Track header height for pushing panels down
  const [headerHeight, setHeaderHeight] = React.useState(44)
  
  // Zustand stores
  const {
    isCollapsed,
    showModelsList,
    showUploadModal,
    showUploads: showMyUploads,
    showCameraControls,
    setIsCollapsed,
    setShowUploadModal,
    setShowModelsList,
    setShowUploads,
    setShowCameraControls,
    openModelsList,
    openUploads,
    openUploadModal,
    openCameraControls,
  } = useDockedNavigationStore()
  
  // Camera store (for editor state and model utilities)
  const { isEditorEnabled, requestClearScene, requestRotateModel } = useCameraStore()

  // Monitor header visibility - panels stick to top when header is hidden
  React.useEffect(() => {
    const updateHeaderHeight = () => {
      const header = document.getElementById('main-navigation')
      if (header) {
        const rect = header.getBoundingClientRect()
        const headerStyles = window.getComputedStyle(header)
        const isHeaderHidden = headerStyles.display === 'none' || 
                               headerStyles.visibility === 'hidden' ||
                               headerStyles.opacity === '0' ||
                               rect.bottom <= 0
        
        // If header is hidden or scrolled out of view, panels start at top (0)
        // Otherwise, panels start below header (rect.bottom)
        const newHeight = isHeaderHidden ? 0 : Math.max(0, rect.bottom)
        setHeaderHeight(newHeight)
      }
    }
    
    // Update on mount
    updateHeaderHeight()
    
    // Update on resize and scroll
    window.addEventListener('resize', updateHeaderHeight)
    window.addEventListener('scroll', updateHeaderHeight, { passive: true })
    
    // Use MutationObserver to detect header visibility changes
    const header = document.getElementById('main-navigation')
    if (header) {
      const observer = new MutationObserver(updateHeaderHeight)
      observer.observe(header, { 
        attributes: true, 
        attributeFilter: ['style', 'class'],
        childList: true,
        subtree: true
      })
      
      // Use IntersectionObserver for visibility detection
      const intersectionObserver = new IntersectionObserver(
        () => updateHeaderHeight(),
        { threshold: [0, 0.1, 0.5, 1] }
      )
      intersectionObserver.observe(header)
      
      return () => {
        observer.disconnect()
        intersectionObserver.disconnect()
        window.removeEventListener('resize', updateHeaderHeight)
        window.removeEventListener('scroll', updateHeaderHeight)
      }
    }
    
    return () => {
      window.removeEventListener('resize', updateHeaderHeight)
      window.removeEventListener('scroll', updateHeaderHeight)
    }
  }, [])

  // Listen for open-upload events from ModelsList (will be replaced with store later)
  React.useEffect(() => {
    const handleOpenUpload = () => {
      openUploadModal()
    }
    
    if (typeof window !== 'undefined') {
      window.addEventListener('open-upload', handleOpenUpload)
      return () => window.removeEventListener('open-upload', handleOpenUpload)
    }
  }, [openUploadModal])

  const navItems = (): NavItem[] => {
    switch (role) {
      case 'admin':
        return [
          { icon: Camera, label: 'cameraControls', href: '#camera', onClick: () => { openCameraControls(); setIsCollapsed(true); } },
          { icon: Boxes, label: 'clientModels', href: '#models', onClick: openModelsList },
          { icon: FileStack, label: 'uploads', href: '#uploads', onClick: openUploads },
          { icon: Upload, label: 'uploadModels', href: '#upload', onClick: openUploadModal },
          { icon: Users, label: 'userManagement', href: '#users' },
          { icon: Settings, label: 'systemSettings', href: '#settings' }
        ]
      case 'architect':
        return [
          { icon: Camera, label: 'cameraControls', href: '#camera', onClick: () => { openCameraControls(); setIsCollapsed(true); } },
          { icon: Boxes, label: 'clientModels', href: '#my-models', onClick: openModelsList },
          { icon: FileStack, label: 'uploads', href: '#uploads', onClick: openUploads },
          { icon: Upload, label: 'uploadModel', href: '#upload', onClick: openUploadModal }
        ]
      case 'end_user':
        return [
          { icon: Boxes, label: 'myModels', href: '#models', onClick: openModelsList },
          { icon: FileStack, label: 'uploads', href: '#uploads', onClick: openUploads },
          { icon: Upload, label: 'uploadProject', href: '#upload', onClick: openUploadModal }
        ]
      default:
        return []
    }
  }

  if (role === 'guest') return null

  // Model utility handlers
  const handleClearScene = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    console.log('🗑️ [DockedNavigation] Clear scene clicked')
    requestClearScene()
  }
  
  const handleRotateModel = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    console.log('🔄 [DockedNavigation] Rotate model clicked')
    requestRotateModel(Math.PI / 2)
  }

  return (
    <>
      <div
        className={`fixed left-0 top-0 h-screen bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 transition-all    duration-100 z-[100] ${
          isCollapsed ? 'w-12' : 'w-48'
        }`}
        onMouseEnter={() => setIsCollapsed(false)}
        onMouseLeave={() => setIsCollapsed(true)}
      >
        {/* Header */}
        <div className="flex items-center px-4 border-b border-gray-200 dark:border-gray-700" style={{height: '44px'}}>
          {!isCollapsed && (
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
              {role === 'admin' && t('adminPanel')}
              {role === 'architect' && t('architectPortal')}
              {role === 'end_user' && t('myProjects')}
            </h2>
          )}
        </div>

        {/* Navigation Items */}
        <nav>
        <ul className="flex w-full min-w-0 flex-col gap-1">
          <div className="relative flex w-full min-w-0 flex-col p-2 gap-0.5">
            {/* Model Utilities Section - Only show for architect and admin roles */}
            {role !== 'end_user' && (
              <>
                {/* Rotate Model */}
                <li className="group/menu-item relative">
                  <a onClick={handleRotateModel} className="flex w-full items-center gap-2 overflow-hidden rounded-md py-2 px-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 h-8 cursor-pointer group">
                    <div className="flex items-center justify-center shrink-0">
                      <RotateCw className="w-[19px] h-[19px] text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-accent-highlight transition-colors" />
                    </div>
                    <span className={`${isCollapsed ? 'opacity-0 -translate-x-2 pointer-events-none' : 'opacity-100 translate-x-0'} text-xs whitespace-nowrap transition-[opacity,transform] duration-100 text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-accent-highlight`}>{t('rotateModel')}</span>
                  </a>
                </li>

                {/* Clear Scene */}
                <li className="group/menu-item relative">
                  <a onClick={handleClearScene} className="flex w-full items-center gap-2 overflow-hidden rounded-md py-2 px-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 h-8 cursor-pointer group">
                    <div className="flex items-center justify-center shrink-0">
                      <Trash2 className="w-[19px] h-[19px] text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-accent-highlight transition-colors" />
                    </div>
                    <span className={`${isCollapsed ? 'opacity-0 -translate-x-2 pointer-events-none' : 'opacity-100 translate-x-0'} text-xs whitespace-nowrap transition-[opacity,transform] duration-100 text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-accent-highlight`}>{t('clearScene')}</span>
                  </a>
                </li>

                {/* Separator after utilities */}
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
                    className="peer/menu-button flex w-full items-center gap-2 overflow-hidden rounded-md py-2 px-1.5 text-left outline-none transition-[width,height,padding] hover:bg-gray-100 dark:hover:bg-gray-800 h-8 group"
                  >
                    <div className="flex items-center justify-center shrink-0">
                      <Icon className="w-[19px] h-[19px] text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-accent-highlight transition-colors" />
                    </div>
                    <span className={`${isCollapsed ? 'opacity-0 -translate-x-2 pointer-events-none' : 'opacity-100 translate-x-0'} text-xs whitespace-nowrap transition-[opacity,transform] duration-100 text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-accent-highlight`}>{t(item.label)}</span>
                  </a>
                </li>
              )
            })}
          </div>
        </ul>
      </nav>

        {/* Role Badge */}
        <div
          className={`absolute bottom-4 left-4 right-4 transition-[opacity,transform]    duration-100 ${
            isCollapsed ? 'opacity-0 translate-x-[-8px] pointer-events-none' : 'opacity-100 translate-x-0'
          }`}
        >
          <div className="px-3 py-2 rounded-lg text-xs font-medium text-center bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
            {role.replace('_', ' ').toUpperCase()}
          </div>
        </div>
      </div>

      {/* Models List for end_user */}
      {role === 'end_user' && showModelsList && userWithRole && (
        <div 
          className={`fixed left-12 ${SUBPANEL_WIDTH} bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-l border-r border-t border-b border-gray-200/50 dark:border-gray-700/50 shadow-lg z-[90] overflow-y-auto transition-all duration-200 ease-out`}
          style={{ 
            top: `${headerHeight}px`,
            height: `calc(100vh - ${headerHeight}px)`
          }}
        >
          <div className="sticky top-0 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-b border-gray-200/50 dark:border-gray-700/50 px-4 z-10 flex items-center justify-between" style={{height: '44px'}}>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">{t('myModels')}</h2>
            <button
              onClick={() => setShowModelsList(false)}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
              aria-label="Close panel"
            >
              <PanelLeftClose className="w-5 h-5 text-gray-400 dark:text-gray-600" />
            </button>
          </div>
          <ModelsList 
            userId={userWithRole.id} 
            onModelSelected={() => setShowModelsList(false)}
          />
        </div>
      )}

      {/* Models List for architect and admin */}
      {(role === 'architect' || role === 'admin') && showModelsList && userWithRole && (
        <div 
          className={`fixed left-12 ${SUBPANEL_WIDTH} bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-l border-r border-t border-b border-gray-200/50 dark:border-gray-700/50 shadow-lg z-[90] overflow-y-auto transition-all duration-200 ease-out`}
          style={{ 
            top: `${headerHeight}px`,
            height: `calc(100vh - ${headerHeight}px)`
          }}
        >
          <div className="sticky top-0 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-b border-gray-200/50 dark:border-gray-700/50 px-4 z-10 flex items-center justify-between" style={{height: '44px'}}>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">{t('clientModels', { default: 'Client Models' })}</h2>
            <button
              onClick={() => setShowModelsList(false)}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors flex-shrink-0"
              aria-label="Close panel"
            >
              <PanelLeftClose className="w-5 h-5 text-gray-400 dark:text-gray-600" />
            </button>
          </div>
          <ArchitectModelsList 
            architectId={userWithRole.id}
            role={role}
            onModelSelected={() => setShowModelsList(false)}
          />
        </div>
      )}

      {/* Upload Modal */}
      <ProjectBriefModal 
        open={showUploadModal} 
        onOpenChange={setShowUploadModal}
        user={userWithRole}
        role={role}
      />

      {/* Uploads panel (admin/architect/end_user) */}
      {showMyUploads && (
        <div 
          className={`fixed left-12 ${SUBPANEL_WIDTH} bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-l border-r border-t border-b border-gray-200/50 dark:border-gray-700/50 shadow-lg z-[90] overflow-y-auto transition-all duration-200 ease-out`}
          style={{ 
            top: `${headerHeight}px`,
            height: `calc(100vh - ${headerHeight}px)`
          }}
        >
          <div className="sticky top-0 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-b border-gray-200/50 dark:border-gray-700/50 px-4 z-10 flex items-center justify-between" style={{height: '44px'}}>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">{t('uploads')}</h2>
            <button
              onClick={() => setShowUploads(false)}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
              aria-label="Close panel"
            >
              <PanelLeftClose className="w-5 h-5 text-gray-400 dark:text-gray-600" />
            </button>
          </div>
          <UploadsList onAssetSelected={() => setShowUploads(false)} />
        </div>
      )}

      {/* Camera Controls panel (admin/architect only) */}
      {showCameraControls && (role === 'admin' || role === 'architect') && (
        <div 
          className={`fixed left-12 w-full bg-transparent border-b border-gray-200/50 dark:border-gray-700/50 z-[90] overflow-y-auto transition-all duration-200 ease-out`}
          style={{ 
            top: `${headerHeight}px`,
            height: `calc(100vh - ${headerHeight}px)`
          }}
        >
          <div className="sticky top-0 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-b border-gray-200/50 dark:border-gray-700/50 px-4 z-10 flex items-center justify-between" style={{height: '44px'}}>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">{t('cameraControls')}</h2>
            <button
              onClick={() => setShowCameraControls(false)}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
              aria-label="Close panel"
            >
              <PanelLeftClose className="w-5 h-5 text-gray-400 dark:text-gray-600 mr-8" />
            </button>
          </div>
          <div className="p-1">
            <CameraPathEditor3D activePathId="default" />
          </div>
        </div>
      )}
    </>
  )
}
