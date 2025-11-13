'use client'

import React, { useState, useCallback } from 'react'
import { Scan, Download, Upload, AlertCircle, CheckCircle } from 'lucide-react'
import { useTranslations } from 'next-intl'
import ExportButton from './ExportButton'

interface RoomScannerProps {
  userId?: string
  onComplete?: () => void
}

export default function RoomScanner({ userId, onComplete }: RoomScannerProps) {
  const t = useTranslations('Dock')
  const [isScanning, setIsScanning] = useState(false)
  const [scanStatus, setScanStatus] = useState<'idle' | 'scanning' | 'processing' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [uploadedFilePath, setUploadedFilePath] = useState<string | null>(null)

  // Check if we're on iOS and if the Room Plan Scanner app is available
  // More robust iOS detection
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                (/Mac/.test(navigator.userAgent) && 'ontouchend' in document) ||
                window.navigator.maxTouchPoints > 1
  // Try different possible URL schemes for Room Plan Scanner
  const roomPlanAppURLs = [
    'roomscanner://',         // Your RoomPlanExampleApp (most likely to work)
    'roomscanner://scan',     // Your RoomPlanExampleApp with scan action
    'com.apple.roomplan://',  // Apple Room Plan
    'com.apple.roomplan://scan',
    'polycam://',             // Polycam
    'polycam://scan',
    'canvas://',              // Canvas
    'canvas://scan',
    'magicplan://',           // MagicPlan
    'magicplan://scan',
    'roomsketcher://',        // RoomSketcher
    'roomsketcher://scan',
    'com.renderscripter.roomplan://scan',  // Original app
    'roomplan://scan'
  ]

  const handleDeepLinkScan = useCallback(async () => {
    console.log('[DeepLink Debug] Starting deep link scan...')
    console.log('[DeepLink Debug] iOS detected:', isIOS)
    
    if (!isIOS) {
      console.log('[DeepLink Debug] Not iOS device, aborting')
      setErrorMessage('Room scanning is only available on iOS devices')
      setScanStatus('error')
      return
    }

    try {
      setScanStatus('scanning')
      setErrorMessage('')

      // Try your RoomPlanExampleApp first (most likely to work)
      let url = 'roomscanner://'
      
      // Add user ID to the deep link if available
      if (userId) {
        url += `?userId=${userId}`
        console.log(`[DeepLink Debug] Added userId to deep link: ${userId}`)
      }
      
      console.log(`[DeepLink Debug] Attempting to open: ${url}`)
      
      try {
        // Method 1: Try window.open with proper iOS handling
        console.log(`[DeepLink Debug] Trying window.open for: ${url}`)
        const opened = window.open(url, '_self')
        console.log(`[DeepLink Debug] window.open result:`, opened)
        
        // Method 2: Try creating an iframe (iOS deep link method)
        console.log(`[DeepLink Debug] Trying iframe method for: ${url}`)
        const iframe = document.createElement('iframe')
        iframe.style.display = 'none'
        iframe.src = url
        document.body.appendChild(iframe)
        console.log(`[DeepLink Debug] iframe created and appended for: ${url}`)
        setTimeout(() => {
          document.body.removeChild(iframe)
          console.log(`[DeepLink Debug] iframe removed for: ${url}`)
        }, 1000)
        
      } catch (e) {
        console.log(`[DeepLink Debug] Error with ${url}:`, e)
      }

      // Reset status after a short delay to allow the button to be clicked again
      setTimeout(() => {
        setScanStatus('idle')
        setIsScanning(false)
      }, 2000)

    } catch (error) {
      console.error('Failed to open Room Plan Scanner app:', error)
      setErrorMessage('Failed to open Room Plan Scanner app. Please ensure the app is installed.')
      setScanStatus('error')
      setIsScanning(false)
    }
  }, [isIOS])

  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (file.type !== 'model/vnd.usdz+zip' && !file.name.endsWith('.usdz')) {
      setErrorMessage('Please upload a USDZ file')
      setScanStatus('error')
      return
    }

    setUploadedFile(file)
    setScanStatus('processing')

    try {
      // Create form data for upload
      const formData = new FormData()
      formData.append('file', file)
      formData.append('userId', userId || '')
      formData.append('type', 'usdz')
      formData.append('source', 'room-scanner')

      // Upload the USDZ file to the server
      const response = await fetch('/api/upload-usdz', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`)
      }

      const result = await response.json()
      console.log('USDZ file uploaded successfully:', result)

      // Store the file path for export functionality
      setUploadedFilePath(result.fileUrl)
      setScanStatus('success')
      setErrorMessage('')

      // Trigger completion callback
      if (onComplete) {
        setTimeout(onComplete, 1000)
      }

    } catch (error) {
      console.error('Failed to upload USDZ file:', error)
      setErrorMessage('Failed to upload the scanned room file. Please try again.')
      setScanStatus('error')
    }
  }, [userId, onComplete])

  const getStatusIcon = () => {
    switch (scanStatus) {
      case 'scanning':
        return <Scan className="w-5 h-5 text-blue-500 animate-pulse" />
      case 'processing':
        return <Download className="w-5 h-5 text-yellow-500 animate-spin" />
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />
      default:
        return <Scan className="w-5 h-5 text-gray-500" />
    }
  }

  const getStatusMessage = () => {
    switch (scanStatus) {
      case 'scanning':
        return 'Opening Room Plan Scanner app...'
      case 'processing':
        return 'Processing scanned room...'
      case 'success':
        return 'Room scan completed successfully!'
      case 'error':
        return errorMessage
      default:
        return 'Ready to scan room'
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          {t('roomScanner')}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
          Scan rooms using the Room Plan Scanner app and upload USDZ files
        </p>
        
        {/* Scan Size Information */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-4">
          <p className="text-xs text-blue-800 dark:text-blue-300 mb-1">
            <strong>💡 Scan Size Tips:</strong>
          </p>
          <ul className="text-xs text-blue-700 dark:text-blue-400 text-left space-y-1 list-disc list-inside">
            <li>Typical room scans (5-10 MB): Process in 5-10 seconds</li>
            <li>Large scans (10-20 MB): May take 1-2 minutes</li>
            <li>Very large scans (&gt;20 MB): May take up to 4 minutes</li>
            <li>For best results, scan rooms one at a time</li>
          </ul>
        </div>
      </div>

      {/* Status Display */}
      <div className="flex items-center justify-center space-x-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
        {getStatusIcon()}
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {getStatusMessage()}
        </span>
      </div>

      {/* Action Buttons */}
      <div className="space-y-4">
        {/* Deep Link Scan Button */}
        <button
          onClick={handleDeepLinkScan}
          disabled={isScanning || !isIOS}
          className={`w-full flex items-center justify-center space-x-2 px-4 py-3 rounded-lg font-medium transition-colors ${
            isScanning || !isIOS
              ? 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          <Scan className="w-5 h-5" />
          <span>
            {isIOS ? 'Open Room Plan Scanner' : 'iOS Required'}
          </span>
        </button>


        {/* File Upload */}
        <div className="relative">
          <input
            type="file"
            accept=".usdz,model/vnd.usdz+zip"
            onChange={handleFileUpload}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            disabled={scanStatus === 'processing'}
          />
          <div className={`w-full flex items-center justify-center space-x-2 px-4 py-3 rounded-lg font-medium transition-colors border-2 border-dashed ${
            scanStatus === 'processing'
              ? 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 cursor-not-allowed'
              : 'border-gray-400 dark:border-gray-500 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-gray-700 dark:text-gray-300 cursor-pointer'
          }`}>
            <Upload className="w-5 h-5" />
            <span>
              {scanStatus === 'processing' ? 'Processing...' : 'Upload USDZ File'}
            </span>
          </div>
        </div>

        {/* Export Button */}
        {uploadedFilePath && (
          <div className="mt-4">
            <ExportButton
              sceneId={`room-scan-${Date.now()}`}
              usdzPath={uploadedFilePath}
              userId={userId}
              onExportReady={(glbUrl) => {
                console.log('GLB export ready:', glbUrl);
                // Optionally trigger completion or show success message
                if (onComplete) {
                  onComplete();
                }
              }}
              onSaveLocally={() => {
                console.log('Save locally requested');
                // The ExportButton will handle the local save automatically
              }}
            />
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
          How to use:
        </h4>
        <ol className="text-sm text-blue-800 dark:text-blue-200 space-y-1 list-decimal list-inside">
          <li>Install a room scanning app on your iPad (see options below)</li>
          <li>Tap "Open Room Plan Scanner" to launch the iOS app</li>
          <li>Scan your room using the app's built-in tools</li>
          <li>Export the scan as a USDZ file</li>
          <li>Upload the USDZ file using the upload button above</li>
          <li>Click "Export to GLB" to convert for 3D viewing</li>
        </ol>
      </div>

      {/* App Installation Guide */}
      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-green-900 dark:text-green-100 mb-2">
          Recommended Room Scanning Apps:
        </h4>
        <div className="text-sm text-green-800 dark:text-green-200 space-y-2">
          <div>
            <strong>1. Apple Room Plan (Built-in)</strong>
            <p>• Built into iOS 16+ devices</p>
            <p>• Use the "Test Apple Room Plan" button above</p>
          </div>
          <div>
            <strong>2. Polycam (Free)</strong>
            <p>• Download from App Store: "Polycam - 3D Scanner"</p>
            <p>• Excellent for room scanning and USDZ export</p>
          </div>
          <div>
            <strong>3. Canvas (Free)</strong>
            <p>• Download from App Store: "Canvas - 3D Room Scanner"</p>
            <p>• Simple and easy to use</p>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {errorMessage && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <span className="text-sm text-red-700 dark:text-red-300">
              {errorMessage}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
