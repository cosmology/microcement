import { NextResponse } from 'next/server';
import { getCameraPathData, getHotspotSettings } from '@/lib/config/sceneConfig';

export async function GET() {
  console.log('🧪 Testing scene data loading...');
  
  try {
    // Test without userId (should use defaults)
    console.log('📝 Testing without userId...');
    const defaultCamera = await getCameraPathData();
    const defaultHotspot = await getHotspotSettings();
    
    console.log('✅ Default camera data loaded:', {
      cameraPoints: defaultCamera.cameraPoints.length,
      lookAtTargets: defaultCamera.lookAtTargets.length
    });
    
    console.log('✅ Default hotspot data loaded:', {
      colors: Object.keys(defaultHotspot.colors || {}),
      focalDistances: Object.keys(defaultHotspot.focalDistances || {}).length,
      categories: Object.keys(defaultHotspot.categories || {}).length
    });
    
    // Test with a fake userId (should try Supabase)
    console.log('📝 Testing with fake userId...');
    const fakeUserId = 'test-user-123';
    const userCamera = await getCameraPathData(undefined, fakeUserId);
    const userHotspot = await getHotspotSettings(undefined, fakeUserId);
    
    console.log('✅ User camera data loaded:', {
      cameraPoints: userCamera.cameraPoints.length,
      lookAtTargets: userCamera.lookAtTargets.length
    });
    
    console.log('✅ User hotspot data loaded:', {
      colors: Object.keys(userHotspot.colors || {}),
      focalDistances: Object.keys(userHotspot.focalDistances || {}).length,
      categories: Object.keys(userHotspot.categories || {}).length
    });
    
    return NextResponse.json({
      success: true,
      message: 'Scene data loading test completed',
      defaultData: {
        camera: {
          points: defaultCamera.cameraPoints.length,
          targets: defaultCamera.lookAtTargets.length
        },
        hotspot: {
          colors: Object.keys(defaultHotspot.colors || {}),
          focalDistances: Object.keys(defaultHotspot.focalDistances || {}).length,
          categories: Object.keys(defaultHotspot.categories || {}).length
        }
      },
      userData: {
        camera: {
          points: userCamera.cameraPoints.length,
          targets: userCamera.lookAtTargets.length
        },
        hotspot: {
          colors: Object.keys(userHotspot.colors || {}),
          focalDistances: Object.keys(userHotspot.focalDistances || {}).length,
          categories: Object.keys(userHotspot.categories || {}).length
        }
      }
    });
    
  } catch (error) {
    console.error('❌ Scene data loading test failed:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
