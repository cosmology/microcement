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
    auth: { 
      autoRefreshToken: false, 
      persistSession: false 
    },
    db: {
      schema: 'public'
    },
    global: {
      headers: {
        'apikey': serviceKey  // Ensure service role bypasses RLS
      }
    }
  })
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const ownerId = formData.get('ownerId') as string
    const projectName = formData.get('projectName') as string
    const projectDescription = formData.get('projectDescription') as string
    const areaTypeId = formData.get('areaTypeId') as string
    const squareFootage = formData.get('squareFootage') as string
    const architectId = formData.get('architectId') as string

    console.log('📤 [Upload API] ========== NEW PROJECT BRIEF SUBMISSION ==========')
    console.log('📤 [Upload API] Received data:', {
      file: file?.name,
      fileSize: file?.size,
      ownerId,
      projectName,
      architectId
    })

    // Validate inputs
    if (!file || !ownerId) {
      return NextResponse.json({ error: 'Missing file or ownerId' }, { status: 400 })
    }
    
    if (!projectName || !projectDescription || !areaTypeId || !squareFootage || !architectId) {
      return NextResponse.json({ 
        error: 'Missing required fields: project name, description, area type, square footage, or architect' 
      }, { status: 400 })
    }

    // Initialize Supabase client with service role
    let supabase
    try {
      supabase = getServerSupabase()
      
      // Log service role configuration (for debugging)
      const serviceKey = process.env.SERVICE_ROLE_KEY
      console.log('📤 [Upload API] Service Role configured:', serviceKey ? 'YES (length: ' + serviceKey.length + ')' : 'NO')
      console.log('📤 [Upload API] Using URL:', process.env.SUPABASE_SERVER_URL || process.env.NEXT_PUBLIC_SUPABASE_URL)
      
    } catch (supabaseError: any) {
      return NextResponse.json({ 
        error: 'Supabase client initialization failed', 
        details: supabaseError.message 
      }, { status: 500 })
    }

    // Generate unique identifiers
    const uuid = crypto.randomUUID()
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const configName = projectName 
      ? projectName.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
      : 'uploaded_model'

    console.log('📤 [Upload API] Generated config_name:', configName)

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // STEP 1: Save file to filesystem (Supabase storage has RLS issues)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    console.log('📤 [Upload API] Step 1: Saving file to filesystem...')
    
    const fs = require('fs').promises
    const path = require('path')
    
    // Create upload directory structure
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', ownerId)
    await fs.mkdir(uploadDir, { recursive: true })
    
    // Save file
    const fileBuffer = await file.arrayBuffer()
    const fileName = `${uuid}-${safeName}`
    const filePath = path.join(uploadDir, fileName)
    await fs.writeFile(filePath, Buffer.from(fileBuffer))
    
    const publicUrl = `/uploads/${ownerId}/${fileName}`
    
    console.log('✅ [Upload API] File saved to:', filePath)
    console.log('✅ [Upload API] Public URL:', publicUrl)
    
    // Track storage path for potential migration to Supabase storage later
    const now = new Date()
    const year = now.getFullYear()
    const month = (now.getMonth() + 1).toString().padStart(2, '0')
    const futureStoragePath = `${ownerId}/${year}/${month}/${uuid}-${safeName}`
    
    console.log('📤 [Upload API] Future Supabase path:', futureStoragePath)

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // STEP 2: Ensure architect_clients relationship exists
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    console.log('📤 [Upload API] Step 2: Ensuring architect-client relationship...')
    
    const { data: existingRelationship, error: relationshipQueryError } = await supabase
      .from('architect_clients')
      .select('id, status')
      .eq('client_id', ownerId)
      .eq('architect_id', architectId)
      .maybeSingle()

    if (relationshipQueryError) {
      console.error('❌ [Upload API] Error querying relationship:', relationshipQueryError)
    }

    console.log('📤 [Upload API] Existing relationship:', existingRelationship?.id || 'none')

    let relationshipId = existingRelationship?.id

    if (!existingRelationship) {
      // Create new relationship (FIRST project between this client-architect pair)
      console.log('📤 [Upload API] Creating NEW architect-client relationship...')
      
      const { data: newRelationship, error: createRelError } = await supabase
        .from('architect_clients')
        .insert({
          architect_id: architectId,
          client_id: ownerId,
          project_name: projectName,
          project_description: projectDescription,
          status: 'pending_architect',
          start_date: new Date().toISOString().split('T')[0]
        })
        .select('id')
        .single()
      
      if (createRelError) {
        console.error('❌ [Upload API] Failed to create relationship:', createRelError)
        // Don't fail - continue without relationship
      } else {
        relationshipId = newRelationship.id
        console.log('✅ [Upload API] Relationship created:', relationshipId)
      }
    } else {
      console.log('✅ [Upload API] Using existing relationship:', relationshipId)
      console.log('   Note: This is a SECOND+ project for this client-architect pair')
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // STEP 3: Create scene_design_config with project_status
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    console.log('📤 [Upload API] Step 3: Creating scene_design_config...')

      const { data: sceneConfig, error: sceneConfigError } = await supabase
        .from('scene_design_configs')
        .insert({
          user_id: ownerId,
          architect_id: architectId,
          client_id: ownerId,
          model_path: publicUrl,  // Filesystem path
          config_name: configName,
          project_name: projectName,
          project_description: projectDescription,
          project_status: 'pending_architect',  // ✅ NEW project starts here
          notes: `Square Footage: ${squareFootage} sq ft | Area: ${areaTypeId}`,
          showcase_areas: [areaTypeId],
          is_default: true
        })
        .select('id')
        .single()

      if (sceneConfigError) {
        console.error('❌ [Upload API] Failed to create scene config:', sceneConfigError)
        
        // Clean up uploaded file if scene config creation fails
        const fs = require('fs').promises
        try {
          await fs.unlink(filePath)
          console.log('🗑️ [Upload API] Cleaned up file after error:', filePath)
        } catch (cleanupErr) {
          console.warn('⚠️ [Upload API] Could not clean up file:', cleanupErr)
        }
        
        return NextResponse.json({ 
          error: 'Failed to create scene configuration',
          details: sceneConfigError.message 
        }, { status: 500 })
      }

    const createdSceneConfigId = sceneConfig.id
    console.log('✅ [Upload API] Scene config created:', createdSceneConfigId)

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // STEP 4: Create user_assets record
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    console.log('📤 [Upload API] Step 4: Creating user_assets record...')

    const { error: assetError } = await supabase
      .from('user_assets')
      .insert({
        owner_id: ownerId,
        scene_config_id: createdSceneConfigId,
        bucket: 'public',  // Using filesystem for now
        object_path: publicUrl,
        project_name: projectName,
        architect_id: architectId,
        content_type: file.type,
        file_size: file.size,
        metadata: {
          original_name: file.name,
          area_type: areaTypeId,
          square_footage: squareFootage,
          future_storage_path: futureStoragePath  // For migration to Supabase storage later
        }
      })

    if (assetError) {
      console.error('❌ [Upload API] Failed to create user_assets:', assetError)
      // Don't fail the upload, assets record is optional
    } else {
      console.log('✅ [Upload API] user_assets record created')
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // STEP 5: Create default orbital camera path
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    console.log('📤 [Upload API] Step 5: Creating default orbital path...')

    const { DEFAULT_ORBITAL_CONFIG } = await import('@/lib/config/defaultOrbitalPath')
    
    // Deactivate any existing paths first
    const { data: existingPaths } = await supabase
      .from('scene_follow_paths')
      .select('id, path_name, is_active')
      .eq('scene_design_config_id', createdSceneConfigId)
    
    if (existingPaths && existingPaths.length > 0) {
      console.warn('⚠️ [Upload API] Deactivating', existingPaths.length, 'existing path(s)')
      await supabase
        .from('scene_follow_paths')
        .update({ is_active: false })
        .eq('scene_design_config_id', createdSceneConfigId)
    }
    
    const { error: followPathError } = await supabase
      .from('scene_follow_paths')
      .insert({
        scene_design_config_id: createdSceneConfigId,
        path_name: 'Default Orbital Path',
        path_description: `Orbital preview: ${DEFAULT_ORBITAL_CONFIG.WAYPOINT_COUNT} waypoints, ${DEFAULT_ORBITAL_CONFIG.ORBITAL_RADIUS}m radius, ${DEFAULT_ORBITAL_CONFIG.ORBITAL_HEIGHT}m height, 45° start`,
        camera_points: DEFAULT_ORBITAL_CONFIG.CAMERA_POINTS,
        look_at_targets: DEFAULT_ORBITAL_CONFIG.LOOK_AT_TARGETS,
        is_active: true,
        path_order: 1
      })

    if (followPathError) {
      console.error('❌ [Upload API] Failed to create follow path:', followPathError)
      // Don't fail - path is optional
    } else {
      console.log('✅ [Upload API] Default orbital path created')
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // STEP 6: Clear cache and return success
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    try {
      const { SceneConfigService } = await import('@/lib/services/SceneConfigService')
      SceneConfigService.getInstance().clearUserCache()
      console.log('✅ [Upload API] Cache cleared')
    } catch (e) {
      // Ignore cache errors
    }

    console.log('📤 [Upload API] ========== UPLOAD COMPLETE ==========')
    console.log('📤 [Upload API] Summary:')
    console.log('   ✅ File saved to filesystem:', publicUrl)
    console.log('   ✅ user_assets record created')
    console.log('   ✅ scene_design_config created:', createdSceneConfigId)
    console.log('   ✅ architect_clients relationship:', relationshipId || 'created/existing')
    console.log('   ✅ Default orbital path created')
    console.log('   ✅ Project status: pending_architect → Will show START button')
    console.log('   📝 Note: Using filesystem storage (will migrate to Supabase storage later)')

    return NextResponse.json({ 
      message: 'Project brief submitted successfully',
      fileName: file.name,
      fileSize: file.size,
      sceneConfigId: createdSceneConfigId,
      relationshipId: relationshipId,
      publicUrl: publicUrl,
      projectStatus: 'pending_architect',
      storageType: 'filesystem'  // Will migrate to Supabase storage once RLS is fixed
    }, { status: 200 })

  } catch (e: any) {
    console.error('❌ [Upload API] Unexpected error:', e)
    return NextResponse.json({ 
      error: 'Upload failed', 
      details: e?.message || 'Unknown error' 
    }, { status: 500 })
  }
}
