'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { FolderOpen, Loader2 } from 'lucide-react'
import { useTranslations } from 'next-intl'

interface ClientModel {
  clientId: string
  clientName: string
  clientEmail: string
  projectName: string
  models: Array<{
    id: string
    configName: string
    modelPath: string
    isDefault: boolean
  }>
}

export function ArchitectModelsList({ architectId }: { architectId: string }) {
  const [clients, setClients] = useState<ClientModel[]>([])
  const [loading, setLoading] = useState(true)
  const t = useTranslations('Dock')

  useEffect(() => {
    loadClientsAndModels()
  }, [architectId])

  async function loadClientsAndModels() {
    try {
      setLoading(true)

      // Get all clients for this architect
      const { data: clientsData, error: clientsError } = await supabase
        .from('architect_clients')
        .select('client_id, project_name')
        .eq('architect_id', architectId)
        .eq('status', 'active')

      if (clientsError) {
        console.error('❌ Error loading clients:', clientsError)
        return
      }

      // For each client, get their profile and models
      const clientsWithModels = await Promise.all(
        (clientsData || []).map(async (client: any) => {
          // Get client profile
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('user_id, first_name, last_name, company')
            .eq('user_id', client.client_id)
            .maybeSingle()

          // Get client's models (raw from DB)
          const { data: rawModels } = await supabase
            .from('scene_design_configs')
            .select('id, config_name, model_path, is_default')
            .or(`user_id.eq.${client.client_id},client_id.eq.${client.client_id}`)
            .order('created_at', { ascending: false })

          const clientName = profile 
            ? `${profile.first_name} ${profile.last_name}`
            : 'Unknown Client'

          // Normalize models into UI-friendly shape
          const models = (rawModels || []).map((m: any) => ({
            id: String(m.id),
            configName: String(m.config_name ?? ''),
            modelPath: String(m.model_path ?? ''),
            isDefault: Boolean(m.is_default)
          }))

          return {
            clientId: client.client_id,
            clientName,
            clientEmail: '', // Email not needed for display
            projectName: client.project_name,
            models
          }
        })
      )

      setClients(clientsWithModels)
    } catch (error) {
      console.error('❌ Error loading clients and models:', error)
    } finally {
      setLoading(false)
    }
  }

  function handleModelClick(sceneConfigId: string, clientId: string) {
    console.log('🔍 [ArchitectModelsList] Loading model:', sceneConfigId, 'for client:', clientId)
    
    // Dispatch custom event to load the collaborative model
    window.dispatchEvent(new CustomEvent('load-collaborative-model', {
      detail: { sceneConfigId, clientId }
    }))
    
    console.log('🔍 [ArchitectModelsList] Event dispatched with scene config ID:', sceneConfigId)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">{t('loadingModels', { default: 'Loading models' })}</span>
      </div>
    )
  }

  if (clients.length === 0) {
    return (
      <div className="p-4 text-sm text-muted-foreground">
        {t('noClientsFound', { default: 'No active clients found' })}
      </div>
    )
  }

  return (
    <div className="space-y-4 p-4">
      {clients.map((client) => (
        <div key={client.clientId} className="space-y-2">
          {/* Client Header */}
          <div className="border-b border-border pb-2">
            <h3 className="text-sm font-semibold text-foreground">{client.clientName}</h3>
            <p className="text-xs text-muted-foreground">{client.projectName}</p>
          </div>

          {/* Client Models */}
          {client.models.length > 0 ? (
            <div className="space-y-1">
              {client.models.map((model) => (
                <button
                  key={model.id}
                  onClick={() => handleModelClick(model.id, client.clientId)}
                  className="w-full flex items-center gap-2 p-2 text-left text-sm rounded hover:bg-accent transition-colors"
                >
                  <FolderOpen className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <div className="truncate text-foreground">{model.configName}</div>
                    {model.isDefault && (
                      <div className="text-xs text-muted-foreground">{t('defaultModel', { default: 'Default' })}</div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-2 p-2 text-sm text-muted-foreground">
              <FolderOpen className="h-4 w-4" />
              <span>{t('noModelsAvailable', { default: 'No models available' })}</span>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

