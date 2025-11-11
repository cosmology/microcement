'use client'

import React, { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { supabase } from '@/lib/supabase'
import { Boxes, ChevronDown } from 'lucide-react'
import ProjectStatusProgress from './ProjectStatusProgress'


interface ArchitectClient {
  id: string
  architect_id: string
  client_id: string
  project_name: string | null
  project_description: string | null
  status: string | null
  start_date: string | null
  end_date: string | null
  budget: number | null
  notes: string | null
  created_at: string | null
  updated_at: string | null
  scene_config_id?: string
  architect?: {
    first_name: string | null
    last_name: string | null
    company: string | null
  }
}

interface ModelsListProps {
  userId: string
  onModelSelected?: () => void
}

export default function ModelsList({ userId, onModelSelected }: ModelsListProps) {
  const t = useTranslations('Dock')
  const [models, setModels] = useState<ArchitectClient[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedModel, setSelectedModel] = useState<ArchitectClient | null>(null)
  const [missingConfigFor, setMissingConfigFor] = useState<ArchitectClient | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [showFilterDropdown, setShowFilterDropdown] = useState(false)

  useEffect(() => {
    fetchModels()
  }, [userId, statusFilter])

  const fetchModels = async () => {
    try {
      setLoading(true)
      setError(null)

      console.log('🔍 [ModelsList] Fetching models for userId:', userId)
      
      // Check if we have a valid session first
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      if (sessionError) {
        console.error('🔍 [ModelsList] Session error:', sessionError)
        setError('Authentication error')
        return
      }
      
      if (!session) {
        console.log('🔍 [ModelsList] No active session')
        setError('Please log in to view models')
        return
      }
      
      console.log('🔍 [ModelsList] Active session found for user:', session.user.id)
      console.log('🔍 [ModelsList] Session token:', session.access_token ? 'Present' : 'Missing')

      // Fetch all projects for this client (all statuses except completed/cancelled)
      console.log('🔍 [ModelsList] Fetching all projects for client:', userId)
      console.log('🔍 [ModelsList] Status filter:', statusFilter)
      
      let query = supabase
        .from('architect_clients')
        .select('*')
        .eq('client_id', userId)
      
      // Apply status filter if not 'all'
      if (statusFilter === 'all') {
        query = query.in('status', ['pending_upload', 'pending_architect', 'in_progress', 'pending_review', 'active', 'on_hold'])
      } else {
        query = query.eq('status', statusFilter)
      }
      
      const { data, error } = await query

      console.log('🔍 [ModelsList] Basic query result:', data)
      console.log('🔍 [ModelsList] Basic query error:', error)

      if (error) {
        console.error('🔍 [ModelsList] Error fetching models:', error)
        setError('Failed to load models')
        return
      }

      if (!data || data.length === 0) {
        console.log('🔍 [ModelsList] No models found for user:', userId)
        setModels([])
        return
      }

      // For each model, fetch the scene config ID and architect details
      const modelsWithDetails = await Promise.all(
        data.map(async (model) => {
          // Get the scene config for this client
          // Try to find by architect+client first, then fallback to client only
          let sceneConfigId: string | null = null
          if (model.architect_id && model.client_id) {
            // Try exact match first
            const { data } = await supabase
              .from('scene_design_configs')
              .select('id')
              .eq('architect_id', model.architect_id)
              .eq('client_id', model.client_id)
              .eq('is_default', true)
              .maybeSingle()
            
            if (data) {
              sceneConfigId = data.id
            } else {
              // Fallback: find any config for this client
              const { data: fallbackData } = await supabase
                .from('scene_design_configs')
                .select('id')
                .eq('client_id', model.client_id)
                .eq('is_default', true)
                .maybeSingle()
              sceneConfigId = fallbackData?.id || null
            }
          }

          // Fetch architect details if assigned
          let architectDetails: any = {
            first_name: 'Not',
            last_name: 'Assigned',
            company: 'Pending',
            user_id: null
          }
          
          if (model.architect_id) {
            const { data: architectProfile } = await supabase
              .from('user_profiles')
              .select('first_name, last_name, company')
              .eq('user_id', model.architect_id)
              .single()
            
            if (architectProfile) {
              architectDetails = architectProfile
            }
          }

          return {
            ...model,
            scene_config_id: sceneConfigId,
            architect: architectDetails
          }
        })
      )

      console.log('🔍 [ModelsList] Models with details:', modelsWithDetails)
      console.log('🔍 [ModelsList] Total models:', modelsWithDetails.length)
      modelsWithDetails.forEach(m => {
        console.log(`  - ${m.project_name}: status=${m.status}, architect=${m.architect_id ? 'assigned' : 'NULL'}, scene_config=${m.scene_config_id || 'NULL'}`)
      })
      setModels(modelsWithDetails)
    } catch (err) {
      console.error('🔍 [ModelsList] Error fetching models:', err)
      setError('Failed to load models')
    } finally {
      setLoading(false)
    }
  }

  const handleModelSelect = (model: ArchitectClient) => {
    setSelectedModel(model)
    console.log('🔍 [ModelsList] Model selected:', model)
    console.log('🔍 [ModelsList] Scene config ID:', model.scene_config_id)
    console.log('🔍 [ModelsList] Project status:', model.status)
    console.log('🔍 [ModelsList] Project name:', model.project_name)
    
    // Handle pending_upload status - show upload prompt
    if (model.status === 'pending_upload' || !model.scene_config_id) {
      console.log('🔍 [ModelsList] Project pending upload, showing upload prompt')
      setMissingConfigFor(model)
      return
    }
    
    // Dispatch event to load FULL PROJECT (architect's work: hotspots, paths, materials)
    if (typeof window !== 'undefined') {
      console.log('📤 [ModelsList] Loading FULL PROJECT (with architect hotspots/paths)');
      console.log('📤 [ModelsList] Dispatching load-collaborative-model event...');
      
      const event = new CustomEvent('load-collaborative-model', {
        detail: {
          sceneConfigId: model.scene_config_id,
          clientId: model.client_id,
          enableCameraControls: false,  // End users view only
          fullProject: true  // Flag to load complete architect work
        }
      })
      
      const dispatched = window.dispatchEvent(event)
      
      console.log('📤 [ModelsList] Event dispatched successfully:', dispatched)
      console.log('📤 [ModelsList] Event detail:', {
        sceneConfigId: model.scene_config_id,
        clientId: model.client_id,
        fullProject: true
      })
      
      // Close the panel after a short delay to allow the model to load
      setTimeout(() => {
        if (onModelSelected) {
          onModelSelected()
        }
      }, 1000)
    }
  }

  if (loading) {
    return (
      <div className="p-4">
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {t('loadingModels')}...
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
          onClick={fetchModels}
          className="mt-2 px-3 py-1 text-xs bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
        >
          {t('retry')}
        </button>
      </div>
    )
  }

  if (models.length === 0) {
    return (
      <div className="p-4">
        <div className="flex flex-col items-center justify-center py-12">
          <Boxes size={120} className="text-gray-300 dark:text-gray-700 mb-4" />
          <div className="text-xs text-gray-500 dark:text-gray-500 text-center">
            {t('noModelsAvailable')}
          </div>
          <div className="text-xs text-gray-400 dark:text-gray-600 mt-1 text-center">
            {t('contactArchitect')}
          </div>
        </div>
      </div>
    )
  }

  // Filter options
  const filterOptions = [
    { value: 'all', label: 'All Projects' },
    { value: 'pending_upload', label: 'Pending Upload' },
    { value: 'pending_architect', label: 'Pending Architect' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'pending_review', label: 'Pending Review' },
    { value: 'active', label: 'Active' },
    { value: 'on_hold', label: 'On Hold' },
  ]
  
  const currentFilter = filterOptions.find(opt => opt.value === statusFilter) || filterOptions[0]

  // Filter models based on status filter
  const filteredModels = statusFilter === 'all' 
    ? models 
    : models.filter(m => m.status === statusFilter)

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-xs font-medium text-gray-600 dark:text-gray-400">
          <Boxes className="w-4 h-4" />
          <span>{t('myModels', { default: 'Models' })} ({filteredModels.length})</span>
        </div>
        
        {/* Status Filter Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowFilterDropdown(!showFilterDropdown)}
            className="flex items-center gap-1 px-2 py-1 text-xs rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <span className="text-gray-700 dark:text-gray-300">{currentFilter.label}</span>
            <ChevronDown className="w-3 h-3 text-gray-500" />
          </button>
          
          {showFilterDropdown && (
            <>
              {/* Backdrop to close dropdown */}
              <div 
                className="fixed inset-0 z-10" 
                onClick={() => setShowFilterDropdown(false)}
              />
              
              {/* Dropdown menu */}
              <div className="absolute right-0 mt-1 w-40 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-20">
                {filterOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      setStatusFilter(option.value)
                      setShowFilterDropdown(false)
                    }}
                    className={`w-full text-left px-3 py-2 text-xs hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                      statusFilter === option.value 
                        ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 font-medium' 
                        : 'text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {missingConfigFor && (
        <div className="mb-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {missingConfigFor.project_name || t('untitledProject')}
          </div>
          
          <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
            <div className="font-medium">
              {(missingConfigFor.architect as any)?.first_name || 'Unknown'} {(missingConfigFor.architect as any)?.last_name || 'Architect'}
            </div>
            <div className="text-gray-500 dark:text-gray-500">
              {(missingConfigFor.architect as any)?.company || 'Independent Architect'}
            </div>
          </div>
          
          {missingConfigFor.project_description && (
            <div className="text-xs text-gray-500 dark:text-gray-500 mt-2 line-clamp-2">
              {missingConfigFor.project_description}
            </div>
          )}
          
          <div className="flex items-center justify-between mt-2">
            <div className="text-xs text-gray-500 dark:text-gray-500">
              {t('status')}: <span className="capitalize">{missingConfigFor.status}</span>
            </div>
            
            {missingConfigFor.start_date && (
              <div className="text-xs text-gray-500 dark:text-gray-500">
                {new Date(missingConfigFor.start_date).toLocaleDateString()}
              </div>
            )}
          </div>

          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
              No scene configuration found. Start by uploading a model to begin collaboration with your architect.
            </div>
            <button
              onClick={() => {
                // Dispatch event to open the upload modal (same as DockedNavigation)
                if (typeof window !== 'undefined') {
                  window.dispatchEvent(new CustomEvent('open-upload', { detail: { clientId: missingConfigFor.client_id } }))
                }
              }}
              className="px-3 py-1.5 text-xs rounded bg-purple-600 hover:bg-purple-700 text-white transition-colors"
            >
              {t('Upload Project')}
            </button>
          </div>
        </div>
      )}
      
      <div className="space-y-2">
        {filteredModels.map((model) => {
          // Special rendering for pending_upload status
          const isPendingUpload = model.status === 'pending_upload'
          
          return (
            <div
              key={model.id}
              className={`p-3 rounded-lg border transition-colors ${
                isPendingUpload 
                  ? 'bg-amber-50/50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800 cursor-pointer hover:bg-amber-100/50 dark:hover:bg-amber-900/20'
                  : selectedModel?.id === model.id
                    ? 'bg-purple-50 dark:bg-purple-900/20 border-purple-300 dark:border-purple-700 cursor-pointer'
                    : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer'
              }`}
              onClick={() => handleModelSelect(model)}
            >
            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {model.project_name || t('untitledProject')}
            </div>
            
            <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              <div className="font-medium">
                {(model.architect as any)?.first_name || 'Unknown'} {(model.architect as any)?.last_name || 'Architect'}
              </div>
              <div className="text-gray-500 dark:text-gray-500">
                {(model.architect as any)?.company || 'Independent Architect'}
              </div>
              <div className="text-purple-600 dark:text-purple-400">
                {(model.architect as any)?.email || 'ivanprokic@yahoo.com'}
              </div>
            </div>
            
            {model.project_description && (
              <div className="text-xs text-gray-500 dark:text-gray-500 mt-1 line-clamp-2">
                {model.project_description}
              </div>
            )}
            
            <div className="flex items-center justify-between mt-2">
              {model.start_date && (
                <div className="text-xs text-gray-500 dark:text-gray-500">
                  {new Date(model.start_date).toLocaleDateString()}
                </div>
              )}
            </div>
            
            {/* Progress bar for project status */}
            {model.status && (
              <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                <ProjectStatusProgress currentStatus={model.status} compact={true} />
              </div>
            )}
            </div>
          )
        })}
      </div>
      
    </div>
  )
}
