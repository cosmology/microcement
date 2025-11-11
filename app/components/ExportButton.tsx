'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Loader2, CheckCircle, XCircle, Save, Cloud } from 'lucide-react';
import { useExportStatus } from '@/hooks/useExportStatus';
import { toast } from 'sonner';

interface ExportButtonProps {
  sceneId: string;
  usdzPath: string;
  userId?: string;
  onExportReady?: (glbUrl: string) => void;
  onSaveLocally?: () => void;
  className?: string;
}

export default function ExportButton({ 
  sceneId, 
  usdzPath, 
  userId,
  onExportReady,
  onSaveLocally,
  className 
}: ExportButtonProps) {
  const [exportId, setExportId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const { exportStatus, loading } = useExportStatus(exportId ?? undefined);

  const handleExport = async () => {
    if (isExporting) return;

    setIsExporting(true);
    setExportId(null);

    try {
      const response = await fetch('/api/exports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sceneId,
          usdzPath,
          userId
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to start export');
      }

      const data = await response.json();
      setExportId(data.id);
      toast.success('Export started! Processing in background...');
      
    } catch (error) {
      console.error('Export failed:', error);
      toast.error(error instanceof Error ? error.message : 'Export failed');
      setIsExporting(false);
    }
  };

  const handleSaveLocally = () => {
    if (onSaveLocally) {
      onSaveLocally();
    } else {
      // Fallback: trigger download of USDZ file
      const link = document.createElement('a');
      link.href = usdzPath;
      link.download = `${sceneId}.usdz`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('USDZ file saved locally');
    }
  };

  // Handle export status changes
  React.useEffect(() => {
    if (!exportStatus) return;

    switch (exportStatus.status) {
      case 'ready':
        setIsExporting(false);
        toast.success('Export completed! GLB file is ready.');
        if (exportStatus.glbPath && onExportReady) {
          onExportReady(exportStatus.glbPath);
        }
        break;
      case 'failed':
        setIsExporting(false);
        toast.error(exportStatus.error || 'Export failed');
        setExportId(null);
        break;
      case 'processing':
        toast.info('Export is processing...');
        break;
    }
  }, [exportStatus, onExportReady]);

  const getButtonContent = () => {
    if (isExporting || loading) {
      return (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Exporting...</span>
        </>
      );
    }

    if (exportStatus?.status === 'ready') {
      return (
        <>
          <CheckCircle className="w-4 h-4 text-green-500" />
          <span>Export Complete</span>
        </>
      );
    }

    if (exportStatus?.status === 'failed') {
      return (
        <>
          <XCircle className="w-4 h-4 text-red-500" />
          <span>Export Failed</span>
        </>
      );
    }

    return (
      <>
        <Download className="w-4 h-4" />
        <span>Export to GLB</span>
      </>
    );
  };

  const isDisabled = isExporting || loading || exportStatus?.status === 'processing';

  return (
    <div className={className}>
      <div className="flex gap-2">
        <Button
          onClick={handleExport}
          disabled={isDisabled}
          className="flex-1"
          variant={exportStatus?.status === 'ready' ? 'default' : 'outline'}
        >
          {getButtonContent()}
        </Button>
        
        <Button
          onClick={handleSaveLocally}
          disabled={isExporting}
          variant="secondary"
          className="flex-1"
        >
          <Save className="w-4 h-4 mr-2" />
          Save Locally
        </Button>
      </div>
      
      {exportStatus?.status === 'processing' && (
        <p className="text-sm text-muted-foreground mt-2 text-center">
          Converting USDZ to GLB... This may take a few minutes.
        </p>
      )}
      
      {exportStatus?.status === 'failed' && exportStatus.error && (
        <p className="text-sm text-red-500 mt-2 text-center">
          Error: {exportStatus.error}
        </p>
      )}
    </div>
  );
}
