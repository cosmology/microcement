'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { FolderOpen, Loader2, Play, ArrowRight, Eye, CheckCircle, ChevronDown, Boxes } from 'lucide-react'
import { useTranslations } from 'next-intl'

type ProjectStatus = 'pending_upload' | 'pending_architect' | 'in_progress' | 'pending_review' | 'active' | 'completed' | 'on_hold' | 'cancelled'

interface ClientProject {
  id: string
  relationshipId: string
  clientId: string
  clientName: string
  projectName: string
  projectDescription: string
  status: ProjectStatus
  sceneConfigId: string
  modelPath: string
  configName: string
  startDate: string
}

// Group projects by client
interface ClientGroup {
  clientId: string
  clientName: string
  projects: ClientProject[]
}

interface ArchitectModelsListProps {
  architectId: string
  role?: 'admin' | 'architect' | 'end_user'  // User role to determine query scope
  onModelSelected?: () => void  // Callback to close panel
}

// Status button config based on BUSINESS-MODEL.md
const STATUS_BUTTON_CONFIG: Record<ProjectStatus, { label: string; icon: any; bgColor: string }> = {
  'pending_upload': { label: 'Waiting', icon: Loader2, bgColor: 'bg-gray-500' },
  'pending_architect': { label: 'START', icon: Play, bgColor: 'bg-green-600 hover:bg-green-700 dark:bg-accent-highlight dark:hover:bg-accent-highlight/90' },
  'in_progress': { label: 'CONTINUE', icon: ArrowRight, bgColor: 'bg-blue-600 hover:bg-blue-700' },
  'pending_review': { label: 'REVIEW', icon: Eye, bgColor: 'bg-yellow-600 hover:bg-yellow-700' },
  'active': { label: 'FINALIZE', icon: CheckCircle, bgColor: 'bg-purple-600 hover:bg-purple-700' },
  'completed': { label: 'View', icon: Eye, bgColor: 'bg-gray-600 hover:bg-gray-700' },
  'on_hold': { label: 'On Hold', icon: Loader2, bgColor: 'bg-orange-600' },
  'cancelled': { label: 'Cancelled', icon: Loader2, bgColor: 'bg-red-600' },
}

// Status filter options
const STATUS_FILTERS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'pending_architect', label: 'Pending Start' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'pending_review', label: 'Pending Review' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
]

export function ArchitectModelsList({ architectId, role, onModelSelected }: ArchitectModelsListProps) {
  const [clientGroups, setClientGroups] = useState<ClientGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const t = useTranslations('Dock')

  useEffect(() => {
    loadClientProjects()
  }, [architectId])

  async function loadClientProjects() {
    try {
      setLoading(true)
      console.log('🔍 [ArchitectModelsList] Loading projects for role:', role, 'user:', architectId)

      // Build query based on role
      let query = supabase
        .from('scene_design_configs')
        .select('id, user_id, config_name, model_path, architect_id, client_id, created_at')
      
      // Admin sees ALL projects, architect sees only their assigned projects
      if (role !== 'admin') {
        console.log('🔍 [ArchitectModelsList] Filtering by architect_id:', architectId)
        query = query.eq('architect_id', architectId)
      } else {
        console.log('🔍 [ArchitectModelsList] Admin mode - fetching ALL projects (no filter)')
      }
      
      const { data: sceneConfigs, error: configsError } = await query
        .order('created_at', { ascending: false })

      if (configsError) {
        console.error('❌ [ArchitectModelsList] Error loading scene configs:', configsError)
        return
      }

      console.log('✅ [ArchitectModelsList] Found scene_design_configs:', sceneConfigs?.length || 0)
      console.log('✅ [ArchitectModelsList] Role:', role, '| User:', architectId)
      
      if (!sceneConfigs || sceneConfigs.length === 0) {
        console.log('ℹ️ [ArchitectModelsList] No scene configs found')
        console.log('ℹ️ [ArchitectModelsList] This could mean:')
        console.log('  - No projects exist in the database')
        console.log('  - RLS policies are blocking access')
        console.log('  - Query filter is too restrictive')
        setClientGroups([])
        return
      }

      // Batch fetch all client profiles and relationships for better performance
      const clientIds = [...new Set(sceneConfigs.map((c: any) => c.user_id))]
      
      // Fetch all profiles at once
      const { data: profiles } = await supabase
        .from('user_profiles')
        .select('user_id, first_name, last_name')
        .in('user_id', clientIds)
      
      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || [])
      
      // Fetch all relationships at once
      const { data: relationships } = await supabase
        .from('architect_clients')
        .select('id, client_id, status, project_name, project_description, start_date')
        .in('client_id', clientIds)
      
      // Map by client_id since scene_design_config_id doesn't exist yet
      // After migration, you can use scene_design_config_id instead
      const relationshipMap = new Map(relationships?.map(r => [r.client_id, r]) || [])

      // Map configs to projects (now much faster - no sequential queries)
      const projectsData = sceneConfigs.map((config: any) => {
        const profile = profileMap.get(config.user_id)
        const clientName = profile 
          ? `${profile.first_name} ${profile.last_name}`
          : 'Unknown Client'

        // Get relationship by client_id (config.user_id is the client)
        const relationship = relationshipMap.get(config.user_id)

        const status = relationship?.status || 'pending_architect'
        
        // Use config_name as the unique project identifier, not relationship.project_name
        const displayName = config.config_name || relationship?.project_name || 'Untitled Project'
        
        console.log(`✅ Config: ${config.config_name} | Client: ${clientName} | Status: ${status}`)

        return {
          id: config.id,
          relationshipId: relationship?.id || '',
          clientId: config.user_id,
          clientName,
          projectName: displayName,  // Use unique config_name
          projectDescription: relationship?.project_description || '',
          status: status as ProjectStatus,
          sceneConfigId: config.id,
          modelPath: config.model_path || '',
          configName: config.config_name || 'Untitled',
          startDate: relationship?.start_date || ''
        }
      })

      // Group projects by client
      const grouped = projectsData.reduce((acc, project) => {
        const existing = acc.find(g => g.clientId === project.clientId)
        if (existing) {
          existing.projects.push(project)
        } else {
          acc.push({
            clientId: project.clientId,
            clientName: project.clientName,
            projects: [project]
          })
        }
        return acc
      }, [] as ClientGroup[])

      console.log('🔍 [ArchitectModelsList] Grouped by client:', grouped.length, 'clients')
      grouped.forEach(g => {
        console.log(`  📁 ${g.clientName}: ${g.projects.length} project(s)`)
        g.projects.forEach(p => console.log(`     - ${p.configName} (${p.status})`))
      })
      
      setClientGroups(grouped)
    } catch (error) {
      console.error('❌ Error loading client projects:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleProjectAction(project: ClientProject) {
    const { status, sceneConfigId, clientId, relationshipId } = project

    console.log('🎯 [ArchitectModelsList] Project action:', { status, sceneConfigId, clientId, relationshipId })

    // If PENDING_ARCHITECT, update status to IN_PROGRESS first
    if (status === 'pending_architect' && relationshipId) {
      try {
        setUpdatingStatus(project.id)
        
        const response = await fetch('/api/architect-clients/update-status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            relationshipId,
            status: 'in_progress'
          })
        })

        if (!response.ok) {
          throw new Error('Failed to update status')
        }

        console.log('✅ [ArchitectModelsList] Status updated to IN_PROGRESS')
        
        // Reload projects to reflect new status
        await loadClientProjects()
      } catch (error) {
        console.error('❌ Error updating status:', error)
        alert('Failed to start project. Please try again.')
        setUpdatingStatus(null)
        return
      } finally {
        setUpdatingStatus(null)
      }
    }

    // Load the model with camera controls enabled
    console.log('🔍 [ArchitectModelsList] Loading model with scene config ID:', sceneConfigId)
    console.log('🔍 [ArchitectModelsList] Event detail:', {
      sceneConfigId,
      clientId,
      enableCameraControls: true
    })
    
    const event = new CustomEvent('load-collaborative-model', {
      detail: { 
        sceneConfigId, 
        clientId,
        enableCameraControls: true // Enable all camera editing tools
      }
    })
    
    console.log('🔍 [ArchitectModelsList] Dispatching event:', event)
    const dispatched = window.dispatchEvent(event)
    console.log('🔍 [ArchitectModelsList] Event dispatched successfully:', dispatched)
    
    // Close the panel after a short delay to allow the model to load
    setTimeout(() => {
      if (onModelSelected) {
        onModelSelected()
      }
    }, 100)
  }

  // Filter projects by status
  const filteredGroups = clientGroups.map(group => ({
    ...group,
    projects: statusFilter === 'all' 
      ? group.projects 
      : group.projects.filter(p => p.status === statusFilter)
  })).filter(group => group.projects.length > 0) // Remove empty groups

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">{t('loadingModels', { default: 'Loading projects' })}</span>
      </div>
    )
  }

  if (clientGroups.length === 0) {
    return (
      <div className="p-4 text-sm text-muted-foreground">
        {t('noClientsFound', { default: 'No client projects found' })}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Header with Icon, Count, and Status Filter */}
      <div className="px-4 pt-3">
        <div className="flex items-center justify-between mb-3">
          {/* Left: Icon and Count */}
          <div className="flex items-center gap-2 text-xs font-medium text-gray-600 dark:text-gray-400">
            <Boxes className="w-4 h-4" />
            <span>Models ({clientGroups.reduce((sum, group) => sum + group.projects.length, 0)})</span>
          </div>
          
          {/* Right: Status Filter Dropdown */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="flex items-center gap-1 px-2 py-1 text-xs rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 cursor-pointer appearance-none pr-6"
            >
              {STATUS_FILTERS.map(filter => (
                <option key={filter.value} value={filter.value}>
                  {filter.label}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-500 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Client Groups */}
      <div className="px-4 pb-4 space-y-4">
        {filteredGroups.map((group) => (
          <div key={group.clientId} className="space-y-2">
            {/* Client Header */}
            <div className="border-b border-border pb-2">
              <h3 className="text-sm font-semibold text-foreground">{group.clientName}</h3>
              <p className="text-xs text-muted-foreground">{group.projects.length} {group.projects.length === 1 ? 'project' : 'projects'}</p>
            </div>

            {/* Client Projects */}
            <div className="space-y-2">
              {group.projects.map((project) => {
                const buttonConfig = STATUS_BUTTON_CONFIG[project.status]
                const ButtonIcon = buttonConfig.icon
                const isUpdating = updatingStatus === project.id

                return (
                  <div 
                    key={project.id} 
                    className="flex items-center gap-2 p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
                  >
                    {/* Folder Icon */}
                    <FolderOpen className="h-5 w-5 text-gray-500 dark:text-gray-400 flex-shrink-0" />
                    
                    {/* Project Info */}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                        {project.projectName}
                      </div>
                      <div className="text-xs text-gray-400 dark:text-gray-500 truncate mt-0.5" title={project.modelPath}>
                        {project.modelPath ? `📁 ${project.modelPath.split('/').pop()}` : 'No model'}
                      </div>
                    </div>

                    {/* Action Button */}
                    <button
                      onClick={() => handleProjectAction(project)}
                      disabled={isUpdating || project.status === 'pending_upload'}
                      className={`
                        ${buttonConfig.bgColor}
                        text-white text-xs font-semibold px-3 py-1.5 rounded-md
                        flex items-center gap-1.5
                        transition-all duration-200
                        disabled:opacity-50 disabled:cursor-not-allowed
                        flex-shrink-0
                      `}
                      title={`${buttonConfig.label} project`}
                    >
                      {isUpdating ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <ButtonIcon className="h-3.5 w-3.5" />
                      )}
                      <span>{buttonConfig.label}</span>
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        ))}

        {/* No Results After Filter */}
        {filteredGroups.length === 0 && statusFilter !== 'all' && (
          <div className="text-center py-8 text-sm text-muted-foreground">
            No projects found with status: {STATUS_FILTERS.find(f => f.value === statusFilter)?.label}
          </div>
        )}
      </div>
    </div>
  )
}
