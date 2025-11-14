'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Loader2, Download, Eye, Trash2, Calendar, User, Scan, Home, ChevronDown } from 'lucide-react';
import { useSceneStore } from '@/lib/stores/sceneStore';
import { useDockedNavigationStore } from '@/lib/stores/dockedNavigationStore';

interface ScannedRoom {
  id: string;
  user_id: string;
  scene_id: string;
  usdz_path: string;
  glb_path: string | null;
  json_path: string | null;
  status: 'queued' | 'processing' | 'ready' | 'failed';
  error: string | null;
  created_at: string;
  updated_at: string;
  usdz_public_url?: string | null;
  usdz_signed_url?: string | null;
  glb_public_url?: string | null;
  glb_signed_url?: string | null;
  json_public_url?: string | null;
  json_signed_url?: string | null;
}

interface ScannedRoomsListProps {
  userId?: string;
}

export default function ScannedRoomsList({ userId }: ScannedRoomsListProps) {
  const getAccessibleUrl = (...urls: Array<string | null | undefined>) => {
    for (const url of urls) {
      if (url && typeof url === 'string') {
        return url;
      }
    }
    return null;
  };

  const t = useTranslations('Dock');
  const setRoomPlanJsonPath = useSceneStore(state => state.setRoomPlanJsonPath);
  const { setModelLoadingProgress } = useSceneStore();
  const { setShowScannedRooms } = useDockedNavigationStore();
  const [scannedRooms, setScannedRooms] = useState<ScannedRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingRoomId, setLoadingRoomId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);

  useEffect(() => {
    fetchScannedRooms();
  }, [userId]);

  const fetchScannedRooms = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/scanned-rooms?t=${Date.now()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch scanned rooms');
      }
      
      const data = await response.json();
      setScannedRooms(data.rooms || []);
    } catch (err) {
      console.error('Error fetching scanned rooms:', err);
      setError('Failed to load scanned rooms');
    } finally {
      setLoading(false);
    }
  };

  const handleLoadRoom = (room: ScannedRoom) => {
    console.log('🏠 [ScannedRoomsPanel] Load button clicked for room:', room.scene_id);
    
    // Check if GLB file exists
    const modelUrl = getAccessibleUrl(room.glb_signed_url, room.glb_public_url, room.glb_path);
    if (!modelUrl) {
      console.error('❌ [ScannedRoomsPanel] GLB file not available for room:', room.scene_id);
      alert('GLB file not available. The conversion may still be processing or failed.');
      return;
    }

    console.log('🏠 [ScannedRoomsPanel] Dispatching load-uploaded-model event with:', {
      modelPath: modelUrl,
      projectName: room.scene_id,
      roomId: room.id
    });

    // Show loading state
    setLoadingRoomId(room.id);
    setModelLoadingProgress(0);

    // Get JSON path directly from room object
    const jsonPath = getAccessibleUrl(room.json_signed_url, room.json_public_url, room.json_path);
    
    // Store JSON path in Zustand store for SceneEditor to use
    setRoomPlanJsonPath(jsonPath);
    console.log('📐 [RoomPlan] Set JSON path in store:', jsonPath);

    // Dispatch event to load the scanned room in the 3D scene
    try {
      const event = new CustomEvent('load-uploaded-model', {
        detail: {
          modelPath: modelUrl,
          projectName: room.scene_id,
          roomId: room.id,
          jsonPath,
          metadata: {
            scene_id: room.scene_id,
            usdz_path: room.usdz_path,
            usdz_public_url: getAccessibleUrl(room.usdz_signed_url, room.usdz_public_url, room.usdz_path),
            json_path: jsonPath,
            status: room.status,
            created_at: room.created_at
          },
          rawModelOnly: true
        }
      });
      
      const dispatched = window.dispatchEvent(event);
      console.log('🏠 [ScannedRoomsPanel] load-uploaded-model event dispatched:', dispatched);
      
      // Collapse the panel after loading
      setShowScannedRooms(false);
      
      // Clear loading state after a short delay
      setTimeout(() => {
        setLoadingRoomId(null);
      }, 1000);
    } catch (error) {
      console.error('❌ [ScannedRoomsPanel] Failed to dispatch event:', error);
      alert('Failed to load room. Please try again.');
      setLoadingRoomId(null);
    }
  };

  const handleDownloadRoom = (room: ScannedRoom) => {
    // Check if GLB file exists
    const downloadUrl = getAccessibleUrl(room.glb_signed_url, room.glb_public_url, room.glb_path);
    if (!downloadUrl) {
      alert('GLB file not available. The conversion may still be processing or failed.');
      return;
    }

    // Download the GLB file
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = `${room.scene_id}.glb`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDeleteRoom = async (room: ScannedRoom) => {
    if (!confirm('Are you sure you want to delete this scanned room? This will permanently remove all associated files and database records.')) {
      return;
    }

    try {
      // Use the room ID directly for deletion
      const response = await fetch(`/api/scanned-rooms/${room.id}`, {
        method: 'DELETE'
      });

      const result = await response.json();

      if (response.ok && result.success) {
        // Remove from local state
        setScannedRooms(prev => prev.filter(r => r.id !== room.id));
        
        // Show success message with details
        const summary = result.details.summary;
        alert(`Scanned room deleted successfully!\n\nDeleted:\n- ${summary.databaseRecordsDeleted} database record(s)\n- ${summary.associatedRecordsDeleted} associated record(s)\n- ${summary.filesDeleted} file(s)\n- ${summary.directoriesRemoved} directory(ies)`);
      } else {
        // Handle partial success or failure
        if (result.success === false && result.message === 'Partial deletion completed') {
          const summary = result.details.summary;
          const confirmContinue = confirm(
            `Partial deletion completed. Some operations failed.\n\nDeleted:\n- ${summary.databaseRecordsDeleted} database record(s)\n- ${summary.associatedRecordsDeleted} associated record(s)\n- ${summary.filesDeleted} file(s)\n- ${summary.directoriesRemoved} directory(ies)\n\nDo you want to remove this item from the list anyway?`
          );
          
          if (confirmContinue) {
            setScannedRooms(prev => prev.filter(r => r.id !== room.id));
          }
        } else {
          alert(`Failed to delete scanned room: ${result.error || 'Unknown error'}\n\nDetails: ${result.details || 'No additional details available'}`);
        }
      }
    } catch (err) {
      console.error('Error deleting room:', err);
      alert('Failed to delete scanned room: Network error or server unavailable');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-purple-600 dark:text-purple-400" />
          <p className="text-gray-600 dark:text-gray-400">Loading scanned rooms...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-red-600 dark:text-red-400 text-xl mb-2">⚠️</div>
          <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
          <button 
            onClick={fetchScannedRooms}
            className="bg-purple-600 dark:bg-purple-700 text-white px-4 py-2 rounded hover:bg-purple-700 dark:hover:bg-purple-600 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (scannedRooms.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Scan className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400 mb-2">No scanned rooms yet</p>
          <p className="text-gray-500 dark:text-gray-500 text-sm">Scan a room with the iOS app to see it here</p>
        </div>
      </div>
    );
  }

  // Filter options for scanned rooms
  const filterOptions = [
    { value: 'all', label: 'All Statuses' },
    { value: 'ready', label: 'Ready' },
    { value: 'processing', label: 'Processing' },
    { value: 'queued', label: 'Queued' },
    { value: 'failed', label: 'Failed' },
  ];
  
  const currentFilter = filterOptions.find(opt => opt.value === statusFilter) || filterOptions[0];

  // Filter rooms based on status filter
  const filteredRooms = statusFilter === 'all' 
    ? scannedRooms 
    : scannedRooms.filter(r => r.status === statusFilter);

  return (
    <div className="p-4 space-y-4">
      {/* Header with count and filter dropdown */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-xs font-medium text-gray-600 dark:text-gray-400">
          <Home className="w-4 h-4" />
          <span>Rooms ({filteredRooms.length})</span>
        </div>
        
        {/* Status Filter Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowFilterDropdown(!showFilterDropdown)}
            className="flex items-center gap-1 px-2 py-1 text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <span className="text-gray-700 dark:text-gray-300">{currentFilter.label}</span>
            <ChevronDown className="w-3 h-3 text-gray-500" />
          </button>
          
          {showFilterDropdown && (
            <>
              {/* Backdrop to close dropdown */}
              <div 
                className="fixed inset-0 z-10" 
                onClick={() => setShowFilterDropdown(false)}
              />
              
              {/* Dropdown menu */}
              <div className="absolute right-0 mt-1 w-36 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-20">
                {filterOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      setStatusFilter(option.value);
                      setShowFilterDropdown(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                      statusFilter === option.value 
                        ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 font-medium' 
                        : 'text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Rooms list - show empty state if filtered out */}
      {filteredRooms.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Scan className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400 mb-2">No rooms found</p>
            <p className="text-gray-500 dark:text-gray-500 text-sm">No rooms match the selected filter</p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredRooms.map((room) => {
            const glbAvailable = Boolean(getAccessibleUrl(room.glb_signed_url, room.glb_public_url, room.glb_path));
            return (
          <div key={room.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-all cursor-pointer">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {room.scene_id || 'Untitled Room'}
                  </h4>
                  <span className={`ml-2 px-2 py-0.5 rounded text-xs ${
                    room.status === 'ready' ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300' :
                    room.status === 'processing' ? 'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300' :
                    room.status === 'failed' ? 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300' :
                    'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}>
                    {room.status}
                  </span>
                </div>
                <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 space-x-3 mb-3">
                  <div className="flex items-center">
                    <Calendar className="w-3 h-3 mr-1" />
                    {new Date(room.created_at).toLocaleDateString()}
                  </div>
                </div>
                <div className="flex gap-2">
                  {glbAvailable && (
                    <button
                      onClick={() => handleLoadRoom(room)}
                      disabled={loadingRoomId === room.id}
                      className="flex-1 bg-purple-600 dark:bg-purple-400 text-white px-3 py-1.5 rounded text-xs hover:bg-purple-700 dark:hover:bg-purple-500 transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loadingRoomId === room.id ? (
                        <>
                          <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
                          Loading...
                        </>
                      ) : (
                        <>
                          <Eye className="w-3 h-3 mr-1.5" />
                          View
                        </>
                      )}
                    </button>
                  )}
                  {glbAvailable && (
                    <button
                      onClick={() => handleDownloadRoom(room)}
                      className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-3 py-1.5 rounded text-xs hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                    >
                      <Download className="w-3 h-3" />
                    </button>
                  )}
                  <button
                    onClick={() => handleDeleteRoom(room)}
                    className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 p-1.5 transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )})}
        </div>
      )}
    </div>
  );
}
