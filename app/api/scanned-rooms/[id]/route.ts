import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { unlink, rmdir } from 'fs/promises';
import path from 'path';
import { parseSupabaseUri } from '@/lib/storage/utils';
import { deleteStorageObjects } from '@/lib/storage/server';

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
      filesystem: { usdz: false, glb: false, directories: [] as string[] },
      storage: { usdz: false, glb: false, json: false, paths: [] as string[] }
    };
    const storageDeletes = new Map<string, { path: string; type: 'usdz' | 'glb' | 'json' }[]>();

    const queueStorageDeletion = (rawPath: string | null | undefined, type: 'usdz' | 'glb' | 'json') => {
      const parsed = parseSupabaseUri(rawPath ?? undefined);
      if (!parsed) {
        return false;
      }
      const entries = storageDeletes.get(parsed.bucket) ?? [];
      entries.push({ path: parsed.path, type });
      storageDeletes.set(parsed.bucket, entries);
      return true;
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
      // Step 4: Delete files from storage or filesystem
      const filesToDelete: string[] = [];
      const directoriesToCleanup: string[] = [];

      if (exportData.usdz_path) {
        const queued = queueStorageDeletion(exportData.usdz_path, 'usdz');
        if (!queued) {
          const usdzFullPath = path.join(process.cwd(), 'public', exportData.usdz_path);
          filesToDelete.push(usdzFullPath);
          directoriesToCleanup.push(path.dirname(usdzFullPath));
        }
      }

      if (exportData.glb_path) {
        const queued = queueStorageDeletion(exportData.glb_path, 'glb');
        if (!queued) {
          const glbFullPath = path.join(process.cwd(), 'public', exportData.glb_path);
          filesToDelete.push(glbFullPath);
          directoriesToCleanup.push(path.dirname(glbFullPath));
        }
      }

      if ((exportData as any).json_path) {
        queueStorageDeletion((exportData as any).json_path, 'json');
      }

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
        }
      }

      for (const [bucket, entries] of storageDeletes.entries()) {
        try {
          await deleteStorageObjects(bucket, entries.map((entry) => entry.path));
          entries.forEach((entry) => {
            deletionResults.storage[entry.type] = true;
            deletionResults.storage.paths.push(`${bucket}/${entry.path}`);
          });
        } catch (storageError) {
          console.warn('Failed to delete objects from storage bucket:', bucket, storageError);
        }
      }

      const uniqueDirs = [...new Set(directoriesToCleanup)];
      for (const dirPath of uniqueDirs) {
        try {
          await rmdir(dirPath);
          console.log('Successfully removed directory:', dirPath);
          deletionResults.filesystem.directories.push(dirPath);
        } catch (dirError) {
          console.log('Could not remove directory (may not be empty or may not exist):', dirPath);
        }
      }
    } catch (cleanupError) {
      console.error('Cleanup error:', cleanupError);
      console.warn('Cleanup failed, but database deletion succeeded');
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
          storageObjectsDeleted: deletionResults.storage.paths.length,
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
