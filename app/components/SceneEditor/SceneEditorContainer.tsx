'use client'

import React, { useEffect, useRef } from 'react'
import { useCameraStore } from '@/lib/stores/cameraStore'
import { useSceneStore } from '@/lib/stores/sceneStore'
import { SceneEditorProps } from './types'
import SceneEditorCore from '../SceneEditor'

/**
 * SceneEditorContainer - Bridges the legacy SceneEditor with Zustand stores
 * 
 * This container:
 * 1. Subscribes to Zustand stores
 * 2. Syncs store state with the legacy SceneEditor via custom events (temporarily)
 * 3. Provides a migration path to fully refactor SceneEditor
 */
export default function SceneEditorContainer(props: SceneEditorProps) {
  const prevBirdViewRef = useRef<boolean>(false)
  const prevEditorEnabledRef = useRef<boolean>(false)
  const prevLookAtTargetsRef = useRef<boolean>(false)
  const prevHeightIndexRef = useRef<number | null>(null)
  const prevBirdViewLockedRef = useRef<boolean>(false)

  // Subscribe to camera store
  const {
    isBirdView,
    isEditorEnabled,
    showLookAtTargets,
    selectedHeightIndex,
    isBirdViewLocked,
  } = useCameraStore()

  // Bridge store changes to legacy event system (temporary until full migration)
  useEffect(() => {
    if (typeof window === 'undefined') return

    // Bird view changed
    if (prevBirdViewRef.current !== isBirdView) {
      console.log('🔄 [SceneEditorContainer] Dispatching bird-view-animation:', isBirdView)
      window.dispatchEvent(new CustomEvent('bird-view-animation', { 
        detail: { isBirdView } 
      }))
      prevBirdViewRef.current = isBirdView
    }

    // Editor enabled changed
    if (prevEditorEnabledRef.current !== isEditorEnabled) {
      console.log('🔄 [SceneEditorContainer] Dispatching editor-toggle:', isEditorEnabled)
      window.dispatchEvent(new CustomEvent('editor-toggle'))
      prevEditorEnabledRef.current = isEditorEnabled
    }

    // LookAt targets changed
    if (prevLookAtTargetsRef.current !== showLookAtTargets) {
      console.log('🔄 [SceneEditorContainer] Dispatching look-at-toggle:', showLookAtTargets)
      window.dispatchEvent(new CustomEvent('look-at-toggle'))
      prevLookAtTargetsRef.current = showLookAtTargets
    }

    // Height index changed
    if (prevHeightIndexRef.current !== selectedHeightIndex) {
      console.log('🔄 [SceneEditorContainer] Dispatching height-panel-toggle:', selectedHeightIndex)
      window.dispatchEvent(new CustomEvent('height-panel-toggle'))
      prevHeightIndexRef.current = selectedHeightIndex
    }

    // Bird view lock changed
    if (prevBirdViewLockedRef.current !== isBirdViewLocked) {
      console.log('🔄 [SceneEditorContainer] Dispatching bird-view-lock:', isBirdViewLocked)
      window.dispatchEvent(new CustomEvent('bird-view-lock', { 
        detail: { locked: isBirdViewLocked } 
      }))
      prevBirdViewLockedRef.current = isBirdViewLocked
    }
  }, [isBirdView, isEditorEnabled, showLookAtTargets, selectedHeightIndex, isBirdViewLocked])

  // Listen for events from legacy SceneEditor and sync to store
  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleBirdViewFromLegacy = (e: any) => {
      const newState = e.detail?.isBirdView ?? false
      if (newState !== isBirdView) {
        console.log('🔄 [SceneEditorContainer] Syncing bird view from legacy to store:', newState)
        useCameraStore.getState().setIsBirdView(newState)
      }
    }

    window.addEventListener('bird-view-animation', handleBirdViewFromLegacy)
    
    return () => {
      window.removeEventListener('bird-view-animation', handleBirdViewFromLegacy)
    }
  }, [isBirdView])

  console.log('🎬 [SceneEditorContainer] Rendering with store state:', {
    isBirdView,
    isEditorEnabled,
    showLookAtTargets,
    selectedHeightIndex,
    isBirdViewLocked,
    prevBirdView: prevBirdViewRef.current
  })

  return <SceneEditorCore {...props} />
}

