import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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
    const body = await request.json()
    const { name, description, model_url, user_id, created_by, metadata } = body

    if (!name || !model_url || !user_id) {
      return NextResponse.json({ 
        error: 'Missing required fields: name, model_url, user_id' 
      }, { status: 400 })
    }

    const supabase = getServerSupabase()
    
    // Create a new user asset record
    const { data, error } = await supabase
      .from('user_assets')
      .insert({
        project_name: name,
        object_path: model_url,
        bucket: 'models', // or appropriate bucket
        owner_id: user_id,
        content_type: 'model/gltf-binary',
        file_size: 0, // We don't have file size for GLB files
        metadata: {
          ...metadata,
          created_by: created_by || 'ios_scan' // Store in metadata instead
        }
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating user asset:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true,
      asset: data 
    }, { status: 201 })

  } catch (e: any) {
    console.error('Error in POST user-assets:', e)
    return NextResponse.json({ 
      error: e?.message || 'Failed to create asset' 
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const ownerId = searchParams.get('ownerId')

    if (!ownerId) {
      return NextResponse.json({ error: 'Missing ownerId' }, { status: 400 })
    }

    const supabase = getServerSupabase()
    const { data, error } = await supabase
      .from('user_assets')
      .select('id, object_path, bucket, project_name, content_type, file_size, created_at')
      .eq('owner_id', ownerId)
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ assets: data || [] }, { status: 200 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to load uploads' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const assetId = searchParams.get('assetId')

    if (!assetId) {
      return NextResponse.json({ error: 'Missing assetId' }, { status: 400 })
    }

    const supabase = getServerSupabase()
    
    // 1. Get asset details before deletion (to know file path and relationships)
    const { data: asset, error: fetchError } = await supabase
      .from('user_assets')
      .select('id, object_path, bucket, owner_id, scene_config_id, architect_id')
      .eq('id', assetId)
      .single()

    if (fetchError || !asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 })
    }

    console.log('🗑️ [DELETE user-assets] Deleting asset:', {
      id: asset.id,
      path: asset.object_path,
      bucket: asset.bucket,
      sceneConfigId: asset.scene_config_id
    })

    // 2. Delete the physical file from storage (Supabase)
    if (asset.object_path && asset.bucket) {
      try {
        const { error: storageError } = await supabase.storage
          .from(asset.bucket)
          .remove([asset.object_path])

        if (storageError) {
          console.warn('⚠️ [DELETE user-assets] Failed to delete file from storage:', storageError)
          // Continue with database deletion even if file delete fails
        } else {
          console.log('✅ [DELETE user-assets] File deleted from storage:', asset.object_path)
        }
      } catch (storageErr: any) {
        console.warn('⚠️ [DELETE user-assets] Storage delete error:', storageErr)
        // Continue with database deletion
      }
    }
    
    // 2b. Delete the physical file from public filesystem (if exists)
    if (asset.object_path) {
      try {
        const fs = require('fs').promises
        const path = require('path')
        
        // object_path is like "/uploads/{ownerId}/{fileName}"
        // Convert to absolute filesystem path
        const publicFilePath = path.join(process.cwd(), 'public', asset.object_path)
        
        console.log('🗑️ [DELETE user-assets] Attempting to delete file from public fs:', publicFilePath)
        
        // Check if file exists before deleting
        try {
          await fs.access(publicFilePath)
          await fs.unlink(publicFilePath)
          console.log('✅ [DELETE user-assets] File deleted from public filesystem:', publicFilePath)
        } catch (unlinkErr: any) {
          if (unlinkErr.code === 'ENOENT') {
            console.log('ℹ️ [DELETE user-assets] File not found in public fs (already deleted or never existed):', publicFilePath)
          } else {
            console.warn('⚠️ [DELETE user-assets] Failed to delete file from public fs:', unlinkErr.message)
          }
        }
      } catch (fsErr: any) {
        console.warn('⚠️ [DELETE user-assets] Filesystem delete error:', fsErr)
        // Continue with database deletion
      }
    }

    // 3. Delete architect_clients relationships for this asset
    // Note: architect_clients doesn't have scene_config_id FK, so we delete by architect/client IDs
    if (asset.architect_id && asset.owner_id) {
      const { error: architectClientError } = await supabase
        .from('architect_clients')
        .delete()
        .eq('architect_id', asset.architect_id)
        .eq('client_id', asset.owner_id)

      if (architectClientError) {
        console.warn('⚠️ [DELETE user-assets] Failed to delete architect_clients relationship:', architectClientError)
        // Continue with deletion
      } else {
        console.log('✅ [DELETE user-assets] Architect-client relationship deleted')
      }
    }
    
    // 4. Delete associated scene_design_config if exists (cascade will handle follow_paths)
    if (asset.scene_config_id) {
      // First, check how many follow_paths will be cascade deleted
      const { data: followPaths, error: checkError } = await supabase
        .from('scene_follow_paths')
        .select('id, path_name')
        .eq('scene_design_config_id', asset.scene_config_id)
      
      if (!checkError && followPaths) {
        console.log(`🔗 [DELETE user-assets] Found ${followPaths.length} follow_paths that will be cascade deleted:`, 
          followPaths.map(p => p.path_name).join(', '))
      }
      
      const { error: sceneDeleteError } = await supabase
        .from('scene_design_configs')
        .delete()
        .eq('id', asset.scene_config_id)

      if (sceneDeleteError) {
        console.warn('⚠️ [DELETE user-assets] Failed to delete scene config:', sceneDeleteError)
        // Continue with user_assets deletion
      } else {
        console.log('✅ [DELETE user-assets] Scene config deleted (CASCADE deleted follow_paths):', asset.scene_config_id)
        if (followPaths && followPaths.length > 0) {
          console.log(`   ✓ Cascade deleted ${followPaths.length} scene_follow_paths records`)
        }
      }
    }

    // 5. Delete the user_assets record
    const { error: deleteError } = await supabase
      .from('user_assets')
      .delete()
      .eq('id', assetId)

    if (deleteError) {
      return NextResponse.json({ 
        error: 'Failed to delete asset record',
        details: deleteError.message 
      }, { status: 500 })
    }

    console.log('✅ [DELETE user-assets] Asset deleted successfully:', assetId)

    return NextResponse.json({ 
      success: true,
      message: 'Asset deleted successfully',
      deletedId: assetId
    }, { status: 200 })

  } catch (e: any) {
    console.error('❌ [DELETE user-assets] Error:', e)
    return NextResponse.json({ 
      error: e?.message || 'Failed to delete upload' 
    }, { status: 500 })
  }
}
