import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { resolveStorageUrls } from '@/lib/storage/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: exportId } = await params;

    if (!exportId) {
      return NextResponse.json({ error: 'Export ID is required' }, { status: 400 });
    }

    // Fetch export data from database
    const { data: exportData, error } = await supabaseAdmin
      .from('exports')
      .select('*')
      .eq('id', exportId)
      .single();

    if (error) {
      console.error('Error fetching export data:', error);
      return NextResponse.json({ error: 'Export not found' }, { status: 404 });
    }

    console.log('📊 [Exports API] Raw export data from database:', {
      exportId,
      glb_path: exportData.glb_path,
      usdz_path: exportData.usdz_path,
      json_path: (exportData as any).json_path,
      status: exportData.status,
    });
    
    // Resolve Supabase Storage URIs to public/signed URLs
    const existingJsonPath = 
      (exportData as any).json_path ??
      (exportData.usdz_path && !exportData.usdz_path.startsWith('supabase://')
        ? exportData.usdz_path.replace('-Room.usdz', '-room.json').replace('.usdz', '-room.json')
        : null);

    console.log('🔗 [Exports API] Resolving Supabase Storage URIs to public/signed URLs...');
    const [usdzUrls, glbUrls, jsonUrls] = await Promise.all([
      resolveStorageUrls(exportData.usdz_path ?? null),
      resolveStorageUrls(exportData.glb_path ?? null),
      resolveStorageUrls(existingJsonPath ?? null),
    ]);
    
    console.log('✅ [Exports API] URL resolution complete:', {
      usdz: {
        publicUrl: usdzUrls.publicUrl ? 'present ✅' : 'missing',
        signedUrl: usdzUrls.signedUrl ? 'present ✅' : 'missing',
      },
      glb: {
        publicUrl: glbUrls.publicUrl ? 'present ✅' : 'missing',
        signedUrl: glbUrls.signedUrl ? 'present ✅' : 'missing',
        publicUrlPreview: glbUrls.publicUrl?.substring(0, 80) + '...' || 'none',
      },
      json: {
        publicUrl: jsonUrls.publicUrl ? 'present ✅' : 'missing',
        signedUrl: jsonUrls.signedUrl ? 'present ✅' : 'missing',
        publicUrlPreview: jsonUrls.publicUrl?.substring(0, 80) + '...' || 'none',
      },
    });

    // Return export data with resolved URLs
    const responseData = {
      ...exportData,
      json_path: existingJsonPath,
      usdz_public_url: usdzUrls.publicUrl,
      usdz_signed_url: usdzUrls.signedUrl,
      glb_public_url: glbUrls.publicUrl,
      glb_signed_url: glbUrls.signedUrl,
      json_public_url: jsonUrls.publicUrl,
      json_signed_url: jsonUrls.signedUrl,
    };
    
    console.log('📤 [Exports API] Returning export data with resolved URLs');
    return NextResponse.json(responseData);
  } catch (error) {
    console.error('Error in exports API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
