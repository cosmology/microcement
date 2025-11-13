import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { ExportRecord } from '@/lib/types/exports';
import { resolveToPublicUrl } from '@/lib/storage/utils';

export interface ExportStatus {
  id: string;
  status: ExportRecord['status'];
  glbPath?: string;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

export function useExportStatus(exportId?: string) {
  const [exportStatus, setExportStatus] = useState<ExportStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!exportId) return;

    setLoading(true);

    // Initial fetch
    const fetchExportStatus = async () => {
      try {
        const { data, error } = await supabase
          .from('exports')
          .select('*')
          .eq('id', exportId)
          .single();

        if (error) {
          setError(error.message);
          return;
        }

        setExportStatus({
          id: data.id,
          status: data.status,
          glbPath: resolveToPublicUrl(data.glb_path) ?? undefined,
          error: data.error ?? undefined,
          createdAt: data.created_at,
          updatedAt: data.updated_at
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchExportStatus();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('export_status_channel')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'exports',
          filter: `id=eq.${exportId}`
        },
        (payload) => {
          console.log('Export status updated:', payload);
          const newData = payload.new as ExportRecord;
          setExportStatus({
            id: newData.id,
            status: newData.status,
            glbPath: resolveToPublicUrl(newData.glb_path) ?? undefined,
            error: newData.error ?? undefined,
            createdAt: newData.created_at,
            updatedAt: newData.updated_at
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [exportId]);

  return { exportStatus, loading, error };
}

// Hook for subscribing to export ready notifications
export function useExportReadyNotifications(userId?: string) {
  const [readyExports, setReadyExports] = useState<ExportStatus[]>([]);

  useEffect(() => {
    if (!userId) return;

    // Subscribe to broadcast notifications
    const channel = supabase
      .channel('export_channel')
      .on('broadcast', { event: 'export_ready' }, (payload) => {
        console.log('Export ready notification:', payload);
        // Handle the notification
        if (payload?.exportId && payload?.glbUrl) {
          setReadyExports(prev => [...prev, {
            id: payload.exportId,
            status: 'ready',
            glbPath: payload.glbUrl,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }]);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return { readyExports };
}
