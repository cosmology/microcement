'use client'

import { useEffect, useState, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { FileStack, Trash2, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useSceneStore } from '@/lib/stores/sceneStore'

interface AssetItem {
  id: string
  object_path: string
  bucket: string
  project_name: string | null
  content_type: string | null
  file_size: number | null
  created_at: string
}

interface UploadsListProps {
  onAssetSelected?: () => void  // Callback to close panel
}

export default function UploadsList({ onAssetSelected }: UploadsListProps = {}) {
  const t = useTranslations('Dock')
  const { setModelLoadingProgress } = useSceneStore()
  const [assets, setAssets] = useState<AssetItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedAsset, setSelectedAsset] = useState<AssetItem | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null) // Track which asset is being deleted
  const [loadingAssetId, setLoadingAssetId] = useState<string | null>(null)
  const fetchingRef = useRef(false) // Prevent race conditions

  useEffect(() => {
    // Use a ref to prevent duplicate fetches
    if (fetchingRef.current) return
    fetchingRef.current = true
    fetchUploads()
  }, [])

  const fetchUploads = async () => {
    setLoading(true)
    setError(null)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setAssets([])
        setLoading(false)
        return
      }
      
      // Fetch via API route to avoid RLS issues
      const res = await fetch(`/api/user-assets?ownerId=${user.id}`)
      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Failed to load uploads')
      }
      
      const json = await res.json()
      setAssets((json.assets || []) as AssetItem[])
    } catch (e: any) {
      setError(e?.message || 'Failed to load uploads')
    } finally {
      setLoading(false)
    }
  }

  const handleAssetSelect = (asset: AssetItem) => {
    setSelectedAsset(asset)
    setLoadingAssetId(asset.id)
    setModelLoadingProgress(0)
    
    console.log('📤 [UploadsList] Asset selected:', asset.project_name)
    console.log('📤 [UploadsList] Loading RAW MODEL ONLY (no architect hotspots/paths)')
    
    // Dispatch event to load RAW uploaded model (no architect customizations)
    if (typeof window !== 'undefined') {
      const event = new CustomEvent('load-uploaded-model', {
        detail: {
          modelPath: asset.object_path,
          projectName: asset.project_name,
          assetId: asset.id,
          rawModelOnly: true  // Flag: load without architect work
        }
      })
      
      const dispatched = window.dispatchEvent(event)
      
      console.log('📤 [UploadsList] Event dispatched successfully:', dispatched)
      console.log('📤 [UploadsList] Model path:', asset.object_path)
      console.log('📤 [UploadsList] Raw model flag: true (no hotspots/paths)')
    }
    
    // Close the panel after a short delay to allow the model to load
    setTimeout(() => {
      setLoadingAssetId(null)
      if (onAssetSelected) {
        onAssetSelected()
      }
    }, 1000)
  }

  const handleDeleteAsset = async (e: React.MouseEvent, assetId: string) => {
    e.stopPropagation() // Prevent card selection when clicking delete
    
    if (!confirm('Are you sure you want to delete this upload? This will also delete the associated 3D model file.')) {
      return
    }
    
    setDeleting(assetId)
    setError(null)
    
    try {
      const res = await fetch(`/api/user-assets?assetId=${assetId}`, {
        method: 'DELETE'
      })
      
      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Failed to delete upload')
      }
      
      // Remove from local state
      setAssets(prev => prev.filter(a => a.id !== assetId))
      
      // Clear selection if deleted asset was selected
      if (selectedAsset?.id === assetId) {
        setSelectedAsset(null)
      }
      
      console.log('✅ [UploadsList] Asset deleted successfully:', assetId)
    } catch (e: any) {
      setError(e?.message || 'Failed to delete upload')
      console.error('❌ [UploadsList] Delete failed:', e)
    } finally {
      setDeleting(null)
    }
  }

  if (loading) {
    return (
      <div className="p-4">
        <div className="text-sm text-gray-600 dark:text-gray-400">
          Loading uploads...
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
        <button
          onClick={fetchUploads}
          className="mt-2 px-3 py-1 text-xs bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
        >
          Retry
        </button>
      </div>
    )
  }

  if (!assets.length) {
    return (
      <div className="p-4">
        <div className="flex flex-col items-center justify-center py-12">
          <FileStack size={120} className="text-gray-300 dark:text-gray-700 mb-4" />
          <div className="text-xs text-gray-500 dark:text-gray-500 text-center">
            No uploads yet
          </div>
          <div className="text-xs text-gray-400 dark:text-gray-600 mt-1 text-center">
            Upload your first 3D model to get started
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4">
      <div className="flex items-center gap-2 mb-3 text-xs font-medium text-gray-600 dark:text-gray-400">
        <FileStack className="w-4 h-4" />
        <span>{t('uploads', { default: 'Uploads' })} ({assets.length})</span>
      </div>

      <div className="space-y-2">
        {assets.map((asset) => (
          <div
            key={asset.id}
            className={`p-3 rounded-lg border transition-colors cursor-pointer relative group ${
              selectedAsset?.id === asset.id
                ? 'bg-purple-50 dark:bg-purple-900/20 border-purple-300 dark:border-purple-700'
                : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
            onClick={() => handleAssetSelect(asset)}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1 flex-1 flex items-center gap-2">
                {loadingAssetId === asset.id && (
                  <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
                )}
                {asset.project_name || asset.object_path.split('/').slice(-1)[0]}
              </div>
              
              {/* Delete button - shows on hover */}
              <button
                onClick={(e) => handleDeleteAsset(e, asset.id)}
                disabled={deleting === asset.id}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded"
                title="Delete upload"
              >
                <Trash2 className={`w-4 h-4 ${deleting === asset.id ? 'text-gray-400' : 'text-red-500 dark:text-red-400'}`} />
              </button>
            </div>
            
            <div className="text-xs text-gray-500 dark:text-gray-500 truncate">
              {asset.object_path}
            </div>
            
            <div className="flex items-center justify-between mt-2">
              <div className="text-xs text-gray-500 dark:text-gray-500">
                {asset.content_type || 'unknown'}
              </div>
              
              {asset.file_size && (
                <div className="text-xs text-gray-500 dark:text-gray-500">
                  {(asset.file_size / (1024 * 1024)).toFixed(2)} MB
                </div>
              )}
            </div>
            
            {asset.created_at && (
              <div className="text-xs text-gray-400 dark:text-gray-600 mt-1">
                {new Date(asset.created_at).toLocaleDateString()}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

