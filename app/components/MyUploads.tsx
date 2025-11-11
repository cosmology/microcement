'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import { AuthService } from '@/lib/services/AuthService'

interface AssetItem {
  id: string
  object_path: string
  bucket: string
  project_name: string | null
  content_type: string | null
  file_size: number | null
  created_at: string
}

export default function MyUploads() {
  const [assets, setAssets] = useState<AssetItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const identity = await AuthService.getClientIdentity()
        if (!identity) {
          setAssets([])
          setLoading(false)
          return
        }
        
        // Fetch via API route to avoid RLS issues
        const res = await fetch(`/api/user-assets?ownerId=${identity.userId}`)
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
    load()
  }, [])

  const createSigned = async (bucket: string, path: string) => {
    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 10)
    if (error) return null
    return data?.signedUrl || null
  }

  if (loading) return <div className="p-4 text-sm">Loading uploads…</div>
  if (error) return <div className="p-4 text-sm text-red-600">{error}</div>
  if (!assets.length) return <div className="p-4 text-sm">No uploads yet.</div>

  return (
    <div className="p-2">
      <ul className="space-y-2">
        {assets.map((a) => (
          <li key={a.id} className="border border-gray-200 dark:border-gray-700 rounded-md p-2 text-xs">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="font-medium truncate">{a.project_name || a.object_path.split('/').slice(-1)[0]}</div>
                <div className="text-muted-foreground truncate">{a.object_path}</div>
                <div className="text-muted-foreground">{a.content_type || 'unknown'}{a.file_size ? ` • ${(a.file_size / (1024*1024)).toFixed(2)} MB` : ''}</div>
              </div>
              <div className="shrink-0 flex gap-2">
                <Button size="sm" variant="secondary" onClick={async () => {
                  if (a.bucket === 'public') {
                    // Dispatch event to load the uploaded model in ScrollScene
                    if (typeof window !== 'undefined') {
                      window.dispatchEvent(new CustomEvent('load-uploaded-model', {
                        detail: {
                          modelPath: a.object_path,
                          projectName: a.project_name,
                          assetId: a.id
                        }
                      }))
                      console.log('📤 [MyUploads] Load uploaded model event dispatched:', {
                        modelPath: a.object_path,
                        projectName: a.project_name,
                        assetId: a.id
                      })
                    }
                  } else {
                    // For Supabase storage files, create signed URL
                    const url = await createSigned(a.bucket, a.object_path)
                    if (url) window.open(url, '_blank')
                  }
                }}>Load Model</Button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}


