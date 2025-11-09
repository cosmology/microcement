import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { unlink, rmdir } from 'fs/promises';
import path from 'path';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: exportId } = await params;

    if (!exportId) {
      return NextResponse.json({ 
        error: 'Export ID is required',
        details: 'The export ID parameter is missing'
      }, { status: 400 });
    }

    // Validate export ID format (should be a UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(exportId)) {
      return NextResponse.json({ 
        error: 'Invalid export ID format',
        details: 'Export ID must be a valid UUID'
      }, { status: 400 });
    }

    console.log('Starting cascading deletion for export ID:', exportId);

    // Step 1: Fetch export data to get file paths
    const { data: exportData, error: fetchError } = await supabaseAdmin
      .from('exports')
      .select('*')
      .eq('id', exportId)
      .single();

    if (fetchError || !exportData) {
      console.error('Error fetching export data:', fetchError);
      return NextResponse.json({ 
        error: 'Export not found',
        details: 'The specified export ID does not exist'
      }, { status: 404 });
    }

    console.log('Export data found:', {
      id: exportData.id,
      usdz_path: exportData.usdz_path,
      glb_path: exportData.glb_path,
      status: exportData.status
    });

    const deletionResults = {
      database: { exports: false, user_assets: false },
      filesystem: { usdz: false, glb: false, directories: [] as string[] }
    };

    try {
      // Step 2: Delete associated user_assets records
      const { error: userAssetsError } = await supabaseAdmin
        .from('user_assets')
        .delete()
        .eq('metadata->>export_id', exportId);

      if (userAssetsError) {
        console.error('Error deleting user_assets:', userAssetsError);
      } else {
        deletionResults.database.user_assets = true;
        console.log('Successfully deleted associated user_assets records');
      }

      // Step 3: Delete export record from database
      const { error: exportDeleteError } = await supabaseAdmin
        .from('exports')
        .delete()
        .eq('id', exportId);

      if (exportDeleteError) {
        console.error('Error deleting export record:', exportDeleteError);
        return NextResponse.json({ 
          error: 'Failed to delete export from database',
          details: exportDeleteError.message
        }, { status: 500 });
      } else {
        deletionResults.database.exports = true;
        console.log('Successfully deleted export record from database');
      }

    } catch (dbError) {
      console.error('Database deletion error:', dbError);
      return NextResponse.json({ 
        error: 'Database deletion failed',
        details: dbError instanceof Error ? dbError.message : 'Unknown database error'
      }, { status: 500 });
    }

    try {
      // Step 4: Delete files from filesystem
      const filesToDelete: string[] = [];
      const directoriesToCleanup: string[] = [];

      // Add USDZ file to deletion list
      if (exportData.usdz_path) {
        const usdzFullPath = path.join(process.cwd(), 'public', exportData.usdz_path);
        filesToDelete.push(usdzFullPath);
        
        // Extract directory for cleanup
        const usdzDir = path.dirname(usdzFullPath);
        directoriesToCleanup.push(usdzDir);
      }

      // Add GLB file to deletion list
      if (exportData.glb_path) {
        const glbFullPath = path.join(process.cwd(), 'public', exportData.glb_path);
        filesToDelete.push(glbFullPath);
        
        // Extract directory for cleanup
        const glbDir = path.dirname(glbFullPath);
        directoriesToCleanup.push(glbDir);
      }

      // Delete individual files
      for (const filePath of filesToDelete) {
        try {
          await unlink(filePath);
          console.log('Successfully deleted file:', filePath);
          if (filePath.endsWith('.usdz')) {
            deletionResults.filesystem.usdz = true;
          } else if (filePath.endsWith('.glb')) {
            deletionResults.filesystem.glb = true;
          }
        } catch (fileError) {
          console.warn('Failed to delete file:', filePath, fileError);
          // Continue with other files even if one fails
        }
      }

      // Clean up empty directories (from unique set)
      const uniqueDirs = [...new Set(directoriesToCleanup)];
      for (const dirPath of uniqueDirs) {
        try {
          await rmdir(dirPath);
          console.log('Successfully removed directory:', dirPath);
          deletionResults.filesystem.directories.push(dirPath);
        } catch (dirError) {
          // Directory might not be empty or might not exist - this is okay
          console.log('Could not remove directory (may not be empty or may not exist):', dirPath);
        }
      }

    } catch (fsError) {
      console.error('Filesystem cleanup error:', fsError);
      // Don't fail the entire operation if filesystem cleanup fails
      console.warn('Filesystem cleanup failed, but database deletion succeeded');
    }

    // Step 5: Return comprehensive deletion results
    const success = deletionResults.database.exports && 
                   (deletionResults.database.user_assets || !exportData.usdz_path); // user_assets deletion is optional

    return NextResponse.json({
      success,
      message: success ? 'Scanned room deleted successfully' : 'Partial deletion completed',
      details: {
        exportId,
        deletionResults,
        summary: {
          databaseRecordsDeleted: deletionResults.database.exports ? 1 : 0,
          associatedRecordsDeleted: deletionResults.database.user_assets ? 1 : 0,
          filesDeleted: (deletionResults.filesystem.usdz ? 1 : 0) + (deletionResults.filesystem.glb ? 1 : 0),
          directoriesRemoved: deletionResults.filesystem.directories.length
        }
      }
    }, { status: success ? 200 : 206 }); // 206 = Partial Content if some operations failed

  } catch (error) {
    console.error('Cascading deletion error:', error);
    return NextResponse.json({ 
      error: 'Internal server error during deletion',
      details: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}
