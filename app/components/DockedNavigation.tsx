'use client'

import React from 'react'
import { Upload, FileStack, Settings, Users, RulerIcon, RotateCw, RotateCcw, PanelLeftClose, Boxes, Camera, Scan, Home, Ruler, Calculator } from 'lucide-react'
import { UserRole } from '@/hooks/useUserRole'
import { useTranslations } from 'next-intl'
import { useDockedNavigationStore } from '@/lib/stores/dockedNavigationStore'
import { useCameraStore } from '@/lib/stores/cameraStore'
import { useSceneStore } from '@/lib/stores/sceneStore'
import { ScrollArea } from '@/components/ui/scroll-area'
import ModelsList from './ModelsList'
import { ArchitectModelsList } from './ArchitectModelsList'
import ProjectBriefModal from './ProjectBriefModal'
import UploadsList from './UploadsList'
import CameraPathEditor3D from './CameraPathEditor3D'
import RoomScanner from './RoomScanner'
import ScannedRoomsList from './ScannedRoomsList'
import CalculatorPanel from './CalculatorPanel'

// UI Constants
const SUBPANEL_WIDTH = 'w-[21rem]' // 800px uniform width for all subpanels
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
  
  // Zustand stores - Use individual selectors for better performance
  // This prevents unnecessary re-renders when unrelated state changes
  const isCollapsed = useDockedNavigationStore((state) => state.isCollapsed)
  const showModelsList = useDockedNavigationStore((state) => state.showModelsList)
  const showUploadModal = useDockedNavigationStore((state) => state.showUploadModal)
  const showMyUploads = useDockedNavigationStore((state) => state.showUploads)
  const showCameraControls = useDockedNavigationStore((state) => state.showCameraControls)
  const showScanner = useDockedNavigationStore((state) => state.showScanner)
  const showScannedRooms = useDockedNavigationStore((state) => state.showScannedRooms)
  const showCalculator = useDockedNavigationStore((state) => state.showCalculator)
  
  // Actions - These are stable references, safe to extract
  const setIsCollapsed = useDockedNavigationStore((state) => state.setIsCollapsed)
  const setShowUploadModal = useDockedNavigationStore((state) => state.setShowUploadModal)
  const setShowModelsList = useDockedNavigationStore((state) => state.setShowModelsList)
  const setShowUploads = useDockedNavigationStore((state) => state.setShowUploads)
  const setShowCameraControls = useDockedNavigationStore((state) => state.setShowCameraControls)
  const setShowScanner = useDockedNavigationStore((state) => state.setShowScanner)
  const setShowScannedRooms = useDockedNavigationStore((state) => state.setShowScannedRooms)
  const setShowCalculator = useDockedNavigationStore((state) => state.setShowCalculator)
  const openModelsList = useDockedNavigationStore((state) => state.openModelsList)
  const openUploads = useDockedNavigationStore((state) => state.openUploads)
  const openUploadModal = useDockedNavigationStore((state) => state.openUploadModal)
  const openCameraControls = useDockedNavigationStore((state) => state.openCameraControls)
  const openScanner = useDockedNavigationStore((state) => state.openScanner)
  const openScannedRooms = useDockedNavigationStore((state) => state.openScannedRooms)
  const openCalculator = useDockedNavigationStore((state) => state.openCalculator)
  
  // Camera store (for editor state and model utilities)
  const isEditorEnabled = useCameraStore((state) => state.isEditorEnabled)
  const requestClearScene = useCameraStore((state) => state.requestClearScene)
  const requestRotateModel = useCameraStore((state) => state.requestRotateModel)
  
  // Scene store (for measurements toggle and metadata check)
  const showMeasurements = useSceneStore((state) => state.showMeasurements)
  const toggleMeasurements = useSceneStore((state) => state.toggleMeasurements)
  const roomPlanMetadata = useSceneStore((state) => state.roomPlanMetadata)
  const roomPlanJsonPath = useSceneStore((state) => state.roomPlanJsonPath)
  const modelLoaded = useSceneStore((state) => state.modelLoaded)

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

  const [forceExpanded, setForceExpanded] = React.useState(() => {
    if (typeof window !== 'undefined' && (window as any).__PLAYWRIGHT_EXPAND_NAV__) {
      return true
    }
    return false
  })

  React.useLayoutEffect(() => {
    if (typeof window !== 'undefined' && (window as any).__PLAYWRIGHT_EXPAND_NAV__) {
      setForceExpanded(true)
      setIsCollapsed(false)
    }
  }, [setIsCollapsed])

  React.useEffect(() => {
    if (forceExpanded && isCollapsed) {
      setIsCollapsed(false)
    }
  }, [forceExpanded, isCollapsed, setIsCollapsed])

  const navItems = (): NavItem[] => {
    switch (role) {
      case 'admin':
        return [
          { icon: Scan, label: 'roomScanner', href: '#scanner', onClick: openScanner },
          { icon: Home, label: 'scannedRooms', href: '#scanned-rooms', onClick: openScannedRooms },
          { icon: Boxes, label: 'clientModels', href: '#models', onClick: openModelsList },
          { icon: FileStack, label: 'uploads', href: '#uploads', onClick: openUploads },
          { icon: Upload, label: 'uploadModels', href: '#upload', onClick: openUploadModal },
          { icon: Camera, label: 'cameraControls', href: '#camera', onClick: () => { openCameraControls(); setIsCollapsed(true); } },
          { icon: Users, label: 'userManagement', href: '#users' },
          { icon: Settings, label: 'systemSettings', href: '#settings' }
        ]
      case 'architect':
        return [
          { icon: Scan, label: 'roomScanner', href: '#scanner', onClick: openScanner },
          { icon: Home, label: 'scannedRooms', href: '#scanned-rooms', onClick: openScannedRooms },
          { icon: Boxes, label: 'clientModels', href: '#my-models', onClick: openModelsList },
          { icon: FileStack, label: 'uploads', href: '#uploads', onClick: openUploads },
          { icon: Upload, label: 'uploadModel', href: '#upload', onClick: openUploadModal },
          { icon: Camera, label: 'cameraControls', href: '#camera', onClick: () => { openCameraControls(); setIsCollapsed(true); } }
        ]
      case 'end_user':
        return [
          { icon: Scan, label: 'roomScanner', href: '#scanner', onClick: openScanner },
          { icon: Home, label: 'scannedRooms', href: '#scanned-rooms', onClick: openScannedRooms },
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
  const handleResetScene = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    console.log('🔄 [DockedNavigation] Reset scene clicked')
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
        onMouseEnter={() => {
          if (!forceExpanded) {
            setIsCollapsed(false)
          }
        }}
        onMouseLeave={() => {
          if (!forceExpanded) {
            setIsCollapsed(true)
          }
        }}
        data-testid="docked-navigation"
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
                      data-testid={`nav-${item.label}`}
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

               {/* Model Utilities Section - Only show for architect and admin roles */}
               {role !== 'end_user' && (
                <>

                  {/* Separator after utilities */}
                  <div className="shrink-0 bg-gray-200 dark:bg-gray-700 h-px w-[calc(100%-1rem)] mx-auto my-1" />

                  {/* Toggle Measurements */}
                  <li className="group/menu-item relative">
                    <a 
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        
                        // Check if metadata is available before toggling
                        const hasMetadata = !!roomPlanMetadata;
                        const hasJsonPath = !!roomPlanJsonPath;
                        
                        console.log('📐 [DockedNav] Toggling measurements, current state:', {
                          showMeasurements,
                          hasMetadata,
                          hasJsonPath,
                          roomPlanJsonPath: roomPlanJsonPath?.substring(0, 100) || 'null',
                        });
                        
                        if (!showMeasurements && !hasMetadata) {
                          // Trying to enable measurements but no metadata available
                          if (!hasJsonPath) {
                            console.warn('⚠️ [DockedNav] Cannot show measurements: No RoomPlan JSON path available');
                            alert('Measurements require RoomPlan metadata. Please load a scanned room with RoomPlan data.');
                          } else {
                            console.warn('⚠️ [DockedNav] Cannot show measurements: RoomPlan metadata not loaded yet or failed to load');
                            alert('RoomPlan metadata is loading or failed to load. Please check the console for details.');
                          }
                          return;
                        }
                        
                        toggleMeasurements();
                        // Note: State update is asynchronous, check console for actual state after toggle
                      }}
                      className={`flex w-full items-center gap-2 overflow-hidden rounded-md py-2 px-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 h-8 cursor-pointer group ${!roomPlanMetadata && !showMeasurements ? 'opacity-50 cursor-not-allowed' : ''}`}
                      title={!roomPlanMetadata && !showMeasurements ? 'RoomPlan metadata required for measurements' : undefined}
                    >
                      <div className="flex items-center justify-center shrink-0">
                        <RulerIcon className={`w-[19px] h-[19px] transition-colors ${showMeasurements ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400'} group-hover:text-blue-600 dark:group-hover:text-blue-400`} />
                      </div>
                      <span className={`${isCollapsed ? 'opacity-0 -translate-x-2 pointer-events-none' : 'opacity-100 translate-x-0'} text-xs whitespace-nowrap transition-[opacity,transform] duration-100 text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-accent-highlight`}>
                        {showMeasurements ? t('hideMeasurements', { default: 'Hide Measurements' }) : t('showMeasurements', { default: 'Show Measurements' })}
                      </span>
                    </a>
                  </li>

                  {/* Material Calculator - Only show if model is loaded */}
                  {modelLoaded && roomPlanMetadata && (
                    <li className="group/menu-item relative">
                      <a 
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
<<<<<<< HEAD
                          // Toggle calculator panel
                          if (showCalculator) {
                            setShowCalculator(false);
                          } else {
                            openCalculator();
                          }
=======
                          openCalculator();
>>>>>>> origin/main
                        }}
                        className={`flex w-full items-center gap-2 overflow-hidden rounded-md py-2 px-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 h-8 cursor-pointer group`}
                        title="Material Calculator"
                      >
                        <div className="flex items-center justify-center shrink-0">
                          <Calculator className={`w-[19px] h-[19px] transition-colors ${showCalculator ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400'} group-hover:text-blue-600 dark:group-hover:text-blue-400`} />
                        </div>
                        <span className={`${isCollapsed ? 'opacity-0 -translate-x-2 pointer-events-none' : 'opacity-100 translate-x-0'} text-xs whitespace-nowrap transition-[opacity,transform] duration-100 text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-accent-highlight`}>
                          {t('calculator', { default: 'Calculator' })}
                        </span>
                      </a>
                    </li>
                  )}

                  {/* Reset Scene */}
                  <li className="group/menu-item relative">
                    <a onClick={handleResetScene} className="flex w-full items-center gap-2 overflow-hidden rounded-md py-2 px-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 h-8 cursor-pointer group">
                      <div className="flex items-center justify-center shrink-0">
                        <RotateCcw className="w-[19px] h-[19px] text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-accent-highlight transition-colors" />
                      </div>
                      <span className={`${isCollapsed ? 'opacity-0 -translate-x-2 pointer-events-none' : 'opacity-100 translate-x-0'} text-xs whitespace-nowrap transition-[opacity,transform] duration-100 text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-accent-highlight`}>{t('resetScene')}</span>
                    </a>
                  </li>

                                  
                  {/* Rotate Model */}
                  {/* <li className="group/menu-item relative">
                    <a onClick={handleRotateModel} className="flex w-full items-center gap-2 overflow-hidden rounded-md py-2 px-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 h-8 cursor-pointer group">
                      <div className="flex items-center justify-center shrink-0">
                        <RotateCw className="w-[19px] h-[19px] text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-accent-highlight transition-colors" />
                      </div>
                      <span className={`${isCollapsed ? 'opacity-0 -translate-x-2 pointer-events-none' : 'opacity-100 translate-x-0'} text-xs whitespace-nowrap transition-[opacity,transform] duration-100 text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-accent-highlight`}>{t('rotateModel')}</span>
                    </a>
                  </li> */}
                
                </>
              )}
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

      {/* Room Scanner Modal */}
      {showScanner && (
        <div 
          className="fixed inset-0 bg-black/95 backdrop-blur-sm z-[200] flex flex-col"
        >
          <div className="flex-shrink-0 bg-black/90 backdrop-blur-md border-b border-gray-700/50 px-4 py-3 flex items-center justify-between min-h-[60px]">
            <h2 className="text-lg font-semibold text-white">{t('roomScanner')}</h2>
            <button
              onClick={() => setShowScanner(false)}
              className="p-2 hover:bg-gray-800 rounded-md transition-colors flex items-center justify-center"
              aria-label="Close room scanner"
            >
              <PanelLeftClose className="w-6 h-6 text-gray-400" />
            </button>
          </div>
          <div className="flex-1 overflow-auto p-4">
            <RoomScanner 
              userId={userWithRole?.id}
              onComplete={() => {
                setShowScanner(false)
                // Optionally reload models list
                window.dispatchEvent(new CustomEvent('reload-models'))
              }}
            />
          </div>
        </div>
      )}

      {/* Scanned Rooms Panel */}
      {showScannedRooms && (
        <div 
          className={`fixed left-12 ${SUBPANEL_WIDTH} bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-l border-r border-t border-b border-gray-200/50 dark:border-gray-700/50 shadow-lg z-[90] overflow-y-auto transition-all duration-200 ease-out`}
          style={{ 
            top: `${headerHeight}px`,
            height: `calc(100vh - ${headerHeight}px)`
          }}
        >
          <div className="sticky top-0 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-b border-gray-200/50 dark:border-gray-700/50 px-4 z-10 flex items-center justify-between" style={{height: '44px'}}>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">{t('scannedRooms')}</h2>
            <button
              onClick={() => setShowScannedRooms(false)}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
              aria-label="Close panel"
            >
              <PanelLeftClose className="w-5 h-5 text-gray-400 dark:text-gray-600" />
            </button>
          </div>
          <ScannedRoomsList userId={userWithRole?.id} />
        </div>
      )}

      {/* Material Calculator Panel */}
      {showCalculator && modelLoaded && roomPlanMetadata && (
        <CalculatorPanel />
      )}
    </>
  )
}
