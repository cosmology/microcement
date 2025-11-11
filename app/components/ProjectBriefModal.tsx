'use client'

import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useUserRole } from '@/hooks/useUserRole'
import { SceneConfigService } from '@/lib/services/SceneConfigService'
import { supabase } from '@/lib/supabase'
import { ChefHat, Droplet, Sofa, Bed, Trees, Building2, Square } from 'lucide-react'
import { useTranslations } from 'next-intl'

interface ProjectBriefModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface ArchitectOption {
  id: string
  email: string | null
  name: string | null
}

interface AreaType {
  id: number
  name: string
  display_name: string
  description: string | null
  icon: string | null
}

// Icon mapping for area types
const getAreaIcon = (iconName: string | null) => {
  const iconMap: Record<string, any> = {
    'chef-hat': ChefHat,
    'droplet': Droplet,
    'sofa': Sofa,
    'bed': Bed,
    'tree': Trees,
    'building': Building2,
    'floor-icon': Square,
  }
  return iconMap[iconName || ''] || Square
}

interface ProjectBriefModalPropsExtended extends ProjectBriefModalProps {
  user?: any;
  role?: 'admin' | 'architect' | 'end_user' | 'guest';
}

export default function ProjectBriefModal({ open, onOpenChange, user, role }: ProjectBriefModalPropsExtended) {
  // Use props instead of calling useUserRole again
  const t = useTranslations('UploadModal')
  const [projectName, setProjectName] = useState('')
  const [projectDescription, setProjectDescription] = useState('')
  const [squareFootage, setSquareFootage] = useState('')
  const [selectedAreaTypeId, setSelectedAreaTypeId] = useState<string>('')
  const [architects, setArchitects] = useState<ArchitectOption[]>([])
  const [areaTypes, setAreaTypes] = useState<AreaType[]>([])
  const [selectedArchitectId, setSelectedArchitectId] = useState<string>('')
  const [file, setFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successUrl, setSuccessUrl] = useState<string | null>(null)
  const [progress, setProgress] = useState<number>(0)
  const [progressTimer, setProgressTimer] = useState<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (!open) return
    setError(null)
    setSuccessUrl(null)
    
    // Load architects for dropdown via server API (service role)
    const loadArchitects = async () => {
      try {
        const res = await fetch('/api/architects', { cache: 'no-store' })
        if (!res.ok) throw new Error('Failed to load architects')
        const json = await res.json()
        const options: ArchitectOption[] = (json.architects || []).map((u: any) => ({ id: u.user_id, email: u.email ?? null, name: u.name ?? null }))
        setArchitects(options)
        if (role === 'architect' && user) {
          setSelectedArchitectId(user.id)
        }
      } catch (e) {
        // fallback to empty list silently
      }
    }
    
    // Load area types
    const loadAreaTypes = async () => {
      try {
        const { data } = await supabase
          .from('area_types')
          .select('*')
          .order('display_name', { ascending: true })
        
        if (data) {
          setAreaTypes(data as AreaType[])
        }
      } catch (e) {
        // fallback to empty list silently
      }
    }
    
    loadArchitects()
    loadAreaTypes()
  }, [open, role, user])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files && e.target.files[0] ? e.target.files[0] : null
    setError(null)
    if (f) {
      // Basic validation: type and size (e.g., 50MB limit)
      const allowedTypes = [
        'model/gltf-binary',
        'model/gltf+json',
        'application/octet-stream',
        'image/png',
        'image/jpeg',
        'image/webp'
      ]
      const maxBytes = 50 * 1024 * 1024
      if (f.size > maxBytes) {
        setError('File is too large (max 50MB).')
        setFile(null)
        return
      }
      if (f.type && !allowedTypes.includes(f.type)) {
        // Allow unknown types for .glb on some systems when type is empty
        const name = f.name.toLowerCase()
        const okByExt = name.endsWith('.glb') || name.endsWith('.gltf') || name.endsWith('.png') || name.endsWith('.jpg') || name.endsWith('.jpeg') || name.endsWith('.webp')
        if (!okByExt) {
          setError('Unsupported file type. Allowed: glb, gltf, png, jpg, webp.')
          setFile(null)
          return
        }
      }
    }
    setFile(f)
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    setError(null)
    setSuccessUrl(null)
    setProgress(0)
    // Simple optimistic progress bar: ramp to 90% while uploading
    if (progressTimer) {
      clearInterval(progressTimer)
    }
    const t = setInterval(() => {
      setProgress((p) => (p < 90 ? p + 2 : p))
    }, 200)
    setProgressTimer(t)
    try {
      if (!user) throw new Error('Not authenticated')
      if (!projectName.trim()) throw new Error('Project name is required')
      if (!projectDescription.trim()) throw new Error('Project description is required')
      if (!selectedAreaTypeId) throw new Error('Please select an area type')
      if (!squareFootage || Number(squareFootage) <= 0) throw new Error('Valid square footage is required')
      if (!selectedArchitectId) throw new Error('Please select an architect')
      if (!file) throw new Error('Please choose a 3D model file')

      // Skip scene config resolution to avoid RLS issues during upload
      // The API will handle creating/updating scene configs as needed
      let sceneConfigId: string | null = null

      // Upload via proxy API to avoid CORS
      const formData = new FormData()
      formData.append('file', file)
      formData.append('ownerId', user.id)
      formData.append('sceneConfigId', sceneConfigId || '')
      formData.append('projectName', projectName)
      formData.append('projectDescription', projectDescription)
      formData.append('areaTypeId', selectedAreaTypeId)
      formData.append('squareFootage', squareFootage)
      formData.append('architectId', selectedArchitectId)

      console.log('📤 [Upload Modal] Starting upload with:', {
        fileName: file.name,
        ownerId: user.id,
        sceneConfigId,
        projectName,
        architectId: selectedArchitectId
      })

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      })

      console.log('📤 [Upload Modal] Upload response status:', res.status)

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Upload failed')
      }

      const result = await res.json()
      setProgress(100)
      if (result.signedUrl) setSuccessUrl(result.signedUrl)
      
      console.log('📤 [Upload Modal] Upload successful, result:', result)
      
      // Dispatch event to refresh user configs first
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('user-config-refresh', {
          detail: { sceneConfigId: result.sceneConfigId }
        }))
        console.log('📤 [Upload Modal] User config refresh event dispatched')
        
        // Wait a moment for config to be cached, then dispatch load event
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('load-uploaded-model', {
            detail: {
              modelPath: result.publicUrl || result.objectKey,
              projectName: projectName,
              sceneConfigId: result.sceneConfigId
            }
          }))
          console.log('📤 [Upload Modal] Load uploaded model event dispatched:', {
            modelPath: result.publicUrl || result.objectKey,
            projectName: projectName,
            sceneConfigId: result.sceneConfigId
          })
        }, 500) // Wait 500ms for config to be loaded
      }
      
      onOpenChange(false)
    } catch (e: any) {
      setError(e?.message || 'Upload failed')
    } finally {
      if (progressTimer) clearInterval(progressTimer)
      setProgressTimer(null)
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onMouseDown={(e) => {
          e.stopPropagation();
        }}
      >
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>{t('description')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
          <div className="space-y-2">
            <Label htmlFor="projectName">{t('projectName')} {t('required')}</Label>
            <Input 
              id="projectName" 
              value={projectName} 
              onChange={(e) => setProjectName(e.target.value)} 
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
              placeholder={t('projectNamePlaceholder')} 
              required 
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="projectDescription">{t('projectDescription')} {t('required')}</Label>
            <Textarea 
              id="projectDescription" 
              value={projectDescription} 
              onChange={(e) => setProjectDescription(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
              placeholder={t('projectDescriptionPlaceholder')}
              rows={3}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="areaType">{t('areaType')} {t('required')}</Label>
            <div className="grid grid-cols-2 gap-2">
              {areaTypes.map((areaType) => {
                const Icon = getAreaIcon(areaType.icon)
                const isSelected = selectedAreaTypeId === String(areaType.id)
                return (
                  <button
                    key={areaType.id}
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setSelectedAreaTypeId(String(areaType.id));
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                    className={`flex items-center gap-2 p-3 rounded-md border transition-colors text-left ${
                      isSelected 
                        ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20' 
                        : 'border-gray-300 dark:border-gray-600 hover:border-purple-300 dark:hover:border-purple-700'
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${isSelected ? 'text-purple-600 dark:text-purple-400' : 'text-gray-600 dark:text-gray-400'}`} />
                    <div>
                      <div className={`text-sm font-medium ${isSelected ? 'text-purple-900 dark:text-purple-100' : 'text-gray-900 dark:text-gray-100'}`}>
                        {areaType.display_name}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="squareFootage">{t('squareFootage')} {t('required')}</Label>
            <Input 
              id="squareFootage" 
              type="number" 
              value={squareFootage} 
              onChange={(e) => setSquareFootage(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
              placeholder={t('squareFootagePlaceholder')}
              min="1"
              required
            />
            <div className="text-[10px] text-muted-foreground">{t('squareFootageHelper')}</div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="architect">{t('selectArchitect')} {t('required')}</Label>
            <select 
              id="architect" 
              className="w-full h-9 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-2 text-sm"
              value={selectedArchitectId} 
              onChange={(e) => setSelectedArchitectId(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              required
            >
              <option value="">{t('selectArchitectPlaceholder')}</option>
              {architects.map(a => (
                <option key={a.id} value={a.id}>{a.name || a.email || a.id}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="file">{t('modelFile')} {t('required')}</Label>
            <Input 
              id="file" 
              type="file" 
              onChange={handleFileChange}
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              required 
              className="cursor-pointer file:cursor-pointer"
              accept=".glb,.gltf"
            />
            <div className="text-[10px] text-muted-foreground">{t('fileHelper')}</div>
          </div>

          {error && (<div className="text-red-600 text-xs">{error}</div>)}
          {successUrl && (<div className="text-green-600 text-xs break-all">{t('uploadSuccess')} {successUrl}</div>)}
          {submitting && (
            <div className="w-full h-2 bg-gray-200 dark:bg-gray-800 rounded">
              <div className="h-2 bg-purple-600 dark:bg-purple-400 rounded" style={{ width: `${progress}%`, transition: 'width 200ms linear' }} />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button 
            disabled={submitting || !file} 
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleSubmit();
            }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            {submitting ? t('uploading') : t('uploadButton')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}


