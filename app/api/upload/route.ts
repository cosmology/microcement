import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  return NextResponse.json({ message: 'Upload route is working' }, { status: 200 })
}

function getServerSupabase() {
  const url = process.env.SUPABASE_SERVER_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    throw new Error('Missing SUPABASE_SERVER_URL/NEXT_PUBLIC_SUPABASE_URL or SERVICE_ROLE_KEY')
  }
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const ownerId = formData.get('ownerId') as string
    const sceneConfigId = formData.get('sceneConfigId') as string
    const projectName = formData.get('projectName') as string
    const projectDescription = formData.get('projectDescription') as string
    const areaTypeId = formData.get('areaTypeId') as string
    const squareFootage = formData.get('squareFootage') as string
    const architectId = formData.get('architectId') as string

    console.log('📤 [Upload API] Received data:', {
      file: file?.name,
      ownerId,
      projectName,
      projectDescription,
      areaTypeId,
      squareFootage,
      architectId
    })

    if (!file || !ownerId) {
      return NextResponse.json({ error: 'Missing file or ownerId' }, { status: 400 })
    }
    
    if (!projectName || !projectDescription || !areaTypeId || !squareFootage || !architectId) {
      return NextResponse.json({ error: 'Missing required fields: project name, description, area type, square footage, or architect' }, { status: 400 })
    }

    // Initialize Supabase client
    let supabase
    try {
      supabase = getServerSupabase()
    } catch (supabaseError: any) {
      return NextResponse.json({ 
        error: 'Supabase client initialization failed', 
        details: supabaseError.message 
      }, { status: 500 })
    }

    // Build object key
    const now = new Date()
    const year = `${now.getFullYear()}`
    const month = `${(now.getMonth() + 1).toString().padStart(2, '0')}`
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const uuid = crypto.randomUUID()
    const objectKey = `uploads/${ownerId}/unassigned/${year}/${month}/${uuid}-${safeName}`

    // For now, let's create a simple file upload without Supabase storage
    // We'll save the file to the public directory and return the URL
    const fs = require('fs').promises
    const path = require('path')
    
    // Create the upload directory structure
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', ownerId)
    await fs.mkdir(uploadDir, { recursive: true })
    
    // Save the file
    const fileBuffer = await file.arrayBuffer()
    const fileName = `${uuid}-${safeName}`
    const filePath = path.join(uploadDir, fileName)
    await fs.writeFile(filePath, Buffer.from(fileBuffer))
    
    const publicUrl = `/uploads/${ownerId}/${fileName}`
    
    console.log('📤 [Upload API] File saved to:', filePath)

    // Validate required fields
    if (!architectId) {
      return NextResponse.json({ error: 'Architect selection is required' }, { status: 400 })
    }

    // Check if there's a pending_upload relationship for this client
    const { data: pendingRelationship } = await supabase
      .from('architect_clients')
      .select('id, status')
      .eq('client_id', ownerId)
      .eq('status', 'pending_upload')
      .maybeSingle()

    console.log('📤 [Upload API] Pending relationship found:', pendingRelationship)

    // Generate config_name from project_name (lowercase with underscores)
    const configName = projectName 
      ? projectName.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
      : 'uploaded_model'

    console.log('📤 [Upload API] Project name:', projectName)
    console.log('📤 [Upload API] Config name:', configName)

    // Create scene configuration for the uploaded model
    let createdSceneConfigId = null
    try {
      const { data: sceneConfig, error: sceneConfigError } = await supabase
        .from('scene_design_configs')
        .insert({
          user_id: ownerId,
          architect_id: architectId,
          client_id: ownerId,
          model_path: publicUrl,
          config_name: configName,
          project_name: projectName || 'Uploaded Model',
          project_description: projectDescription,
          notes: `Square Footage: ${squareFootage} sq ft`,
          showcase_areas: [areaTypeId],
          is_default: true
        })
        .select('id')
        .single()

      if (sceneConfigError) {
        console.error('📤 [Upload API] Failed to create scene config:', sceneConfigError)
        return NextResponse.json({ 
          error: 'Failed to create scene configuration',
          details: sceneConfigError.message 
        }, { status: 500 })
      }

      createdSceneConfigId = sceneConfig.id
      console.log('📤 [Upload API] Scene config created:', createdSceneConfigId)

      // Update pending_upload relationship to pending_architect after upload
      if (pendingRelationship) {
        const { error: updateError } = await supabase
          .from('architect_clients')
          .update({ 
            status: 'pending_architect',
            architect_id: architectId,
            project_name: projectName || 'Uploaded Project',
            project_description: projectDescription,
            start_date: new Date().toISOString().split('T')[0]
          })
          .eq('id', pendingRelationship.id)

        if (updateError) {
          console.error('📤 [Upload API] Failed to update relationship status:', updateError)
        } else {
          console.log('📤 [Upload API] Relationship updated:', {
            status: 'pending_architect',
            architect_id: architectId,
            project_name: projectName
          })
        }
      } else {
        // Create new relationship if none exists
        console.log('📤 [Upload API] No pending relationship, creating new one')
        await supabase
          .from('architect_clients')
          .insert({
            architect_id: architectId,
            client_id: ownerId,
            project_name: projectName || 'New Project',
            project_description: projectDescription,
            status: 'pending_architect',
            start_date: new Date().toISOString().split('T')[0]
          })
      }

      // Create default orbital follow path with camera points and look at targets
      const { DEFAULT_ORBITAL_CONFIG } = await import('@/lib/config/defaultOrbitalPath')
      
      console.log('🎯 [Upload API] ========== CREATING DEFAULT ORBITAL PATH ==========')
      console.log('🎯 [Upload API] Scene Config ID:', createdSceneConfigId)
      console.log('🎯 [Upload API] Orbital Configuration:', {
        waypointCount: DEFAULT_ORBITAL_CONFIG.WAYPOINT_COUNT,
        radius: DEFAULT_ORBITAL_CONFIG.ORBITAL_RADIUS,
        height: DEFAULT_ORBITAL_CONFIG.ORBITAL_HEIGHT,
        startAngle: '45° (northeast)'
      })
      console.log('🎯 [Upload API] First waypoint:', DEFAULT_ORBITAL_CONFIG.CAMERA_POINTS[0])
      console.log('🎯 [Upload API] All lookAt targets point to:', DEFAULT_ORBITAL_CONFIG.LOOK_AT_TARGETS[0])
      
      // CRITICAL: Deactivate ALL existing follow_paths for this config before creating new one
      const { data: existingPaths } = await supabase
        .from('scene_follow_paths')
        .select('id, path_name, is_active')
        .eq('scene_design_config_id', createdSceneConfigId)
      
      if (existingPaths && existingPaths.length > 0) {
        console.warn('⚠️ [Upload API] Found existing follow_paths for this config:', existingPaths)
        console.warn('⚠️ [Upload API] Deactivating all existing paths to ensure only Default Orbital Path is active')
        
        // Deactivate all existing paths
        await supabase
          .from('scene_follow_paths')
          .update({ is_active: false })
          .eq('scene_design_config_id', createdSceneConfigId)
        
        console.log('✅ [Upload API] Deactivated', existingPaths.length, 'existing path(s)')
      } else {
        console.log('✅ [Upload API] No existing follow_paths - clean slate')
      }
      
      const { error: followPathError } = await supabase
        .from('scene_follow_paths')
        .insert({
          scene_design_config_id: createdSceneConfigId,
          path_name: 'Default Orbital Path',
          path_description: 'Orbital camera path for uploaded model preview (45° start, counter-clockwise)',
          camera_points: DEFAULT_ORBITAL_CONFIG.CAMERA_POINTS,
          look_at_targets: DEFAULT_ORBITAL_CONFIG.LOOK_AT_TARGETS,
          is_active: true,
          path_order: 1
        })

      if (followPathError) {
        console.error('❌ [Upload API] Failed to create follow path:', followPathError)
        // Don't fail the upload, just log the error
      } else {
        console.log('✅ [Upload API] Default orbital follow path created!')
        console.log('✅ [Upload API] Path details:', {
          sceneConfigId: createdSceneConfigId,
          pathName: 'Default Orbital Path',
          waypoints: DEFAULT_ORBITAL_CONFIG.WAYPOINT_COUNT,
          active: true,
          order: 1
        })
        
        // Verify the path was created
        const { data: verifyPath } = await supabase
          .from('scene_follow_paths')
          .select('id, path_name, is_active')
          .eq('scene_design_config_id', createdSceneConfigId)
        
        console.log('🔍 [Upload API] Verification - Total paths for this config:', verifyPath?.length || 0)
        if (verifyPath) {
          verifyPath.forEach(p => console.log(`   - ${p.path_name} (active: ${p.is_active})`))
        }
      }
      console.log('🎯 [Upload API] ========== ORBITAL PATH SETUP COMPLETE ==========')
    } catch (sceneConfigErr: any) {
      console.error('📤 [Upload API] Failed to create scene config:', sceneConfigErr)
      return NextResponse.json({ 
        error: 'Failed to create scene configuration',
        details: sceneConfigErr.message 
      }, { status: 500 })
    }

    // Insert into user_assets table with the created scene config
    try {
      await supabase
        .from('user_assets')
        .insert({
          owner_id: ownerId,
          scene_config_id: createdSceneConfigId,
          bucket: 'public',
          object_path: publicUrl,
          project_name: projectName || null,
          architect_id: architectId,
          content_type: file.type || null,
          file_size: file.size || null,
          metadata: null
        })
      console.log('📤 [Upload API] user_assets inserted with scene config:', createdSceneConfigId)
    } catch (insertErr: any) {
      console.warn('📤 [Upload API] Failed to insert user_assets:', insertErr?.message || insertErr)
    }

    // Clear the SceneConfigService cache so the new config is picked up
    try {
      const { SceneConfigService } = await import('@/lib/services/SceneConfigService')
      const sceneConfigService = SceneConfigService.getInstance()
      sceneConfigService.clearUserCache()
      console.log('📤 [Upload API] SceneConfigService cache cleared')
    } catch (cacheErr: any) {
      console.warn('📤 [Upload API] Failed to clear cache:', cacheErr?.message || cacheErr)
    }

    return NextResponse.json({ 
      message: 'File uploaded successfully',
      fileName: file.name,
      fileSize: file.size,
      ownerId,
      publicUrl,
      objectKey: publicUrl,
      sceneConfigId: createdSceneConfigId
    }, { status: 200 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Upload failed' }, { status: 500 })
  }
}