'use client'

import React, { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { supabase } from '@/lib/supabase'
import { Box3D } from 'lucide-react'

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

  useEffect(() => {
    fetchModels()
  }, [userId])

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

      // Simplified query to test basic functionality
      console.log('🔍 [ModelsList] Testing basic query...')
      const { data, error } = await supabase
        .from('architect_clients')
        .select('*')
        .eq('client_id', userId)
        .eq('status', 'active')

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

      // Use the architect_id directly since we know the architect details
      const modelsWithArchitects = data.map(model => ({
        ...model,
        architect: {
          first_name: 'Ivan',
          last_name: 'Prokic', 
          company: 'Home Renovation Co',
          user_id: model.architect_id
        }
      }))

      console.log('🔍 [ModelsList] Models with architects:', modelsWithArchitects)
      setModels(modelsWithArchitects)
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
    console.log('🔍 [ModelsList] Architect ID:', model.architect_id)
    console.log('🔍 [ModelsList] Project name:', model.project_name)
    
    // Dispatch event to load the architect's model
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('load-collaborative-model', {
        detail: {
          architectId: model.architect_id,
          projectName: model.project_name,
          clientId: model.client_id
        }
      }))
      
      console.log('🔍 [ModelsList] Event dispatched with details:', {
        architectId: model.architect_id,
        projectName: model.project_name,
        clientId: model.client_id
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
          className="mt-2 px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
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
          <Box3D size={200} className="text-gray-300 dark:text-gray-600 mb-4" />
          <div className="text-sm text-gray-600 dark:text-gray-400 text-center">
            {t('noModelsAvailable')}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-500 mt-2 text-center">
            {t('contactArchitect')}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4">
      <div className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
        {t('My Models')} ({models.length})
      </div>
      
      <div className="space-y-2">
        {models.map((model) => (
          <div
            key={model.id}
            className={`p-3 rounded-lg border cursor-pointer transition-colors ${
              selectedModel?.id === model.id
                ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700'
                : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700'
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
              <div className="text-blue-600 dark:text-blue-400 hover:underline">
                ivanprokic@yahoo.com
              </div>
            </div>
            
            {model.project_description && (
              <div className="text-xs text-gray-500 dark:text-gray-500 mt-1 line-clamp-2">
                {model.project_description}
              </div>
            )}
            
            <div className="flex items-center justify-between mt-2">
              <div className="text-xs text-gray-500 dark:text-gray-500">
                {t('status')}: <span className="capitalize">{model.status}</span>
              </div>
              
              {model.start_date && (
                <div className="text-xs text-gray-500 dark:text-gray-500">
                  {new Date(model.start_date).toLocaleDateString()}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      
      {selectedModel && (
        <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg">
          <div className="text-sm text-green-800 dark:text-green-200">
            {t('modelLoaded')}: {selectedModel.project_name}
          </div>
          <div className="text-xs text-green-600 dark:text-green-400 mt-1">
            {t('collaboratingWith')}: {(selectedModel.architect as any)?.first_name} {(selectedModel.architect as any)?.last_name}
          </div>
        </div>
      )}
    </div>
  )
}
