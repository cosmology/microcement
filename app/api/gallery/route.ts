import { NextRequest, NextResponse } from 'next/server';

// Ensure this API route is always dynamic on Vercel/Next production
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  // Add CORS headers for Vercel
  const headers = {
    'Content-Type': 'application/json',
    'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  try {
    // Get hotspot from URL parameters instead of dynamic routing
    const url = new URL(request.url);
    const hotspot = url.searchParams.get('hotspot');
    
    // Log request details for debugging
    console.log('🖼️ ===== GALLERY API CALLED =====');
    console.log('🖼️ Request URL:', request.url);
    console.log('🖼️ Hotspot parameter:', hotspot);
    console.log('🖼️ Environment:', process.env.NODE_ENV);
    console.log('🖼️ Vercel:', process.env.VERCEL === '1' ? 'Yes' : 'No');
    console.log('🖼️ ================================');

    // Validate hotspot parameter
    if (!hotspot || typeof hotspot !== 'string') {
      console.log('🖼️ Invalid hotspot parameter, returning fallback');
      return NextResponse.json([
        { thumb: '/images/featured/modern-home.png', full: '/images/featured/modern-home.png', caption: 'Fallback Project 1', width: 1920, height: 1080 }
      ], { headers });
    }

    // Simple test data for specific hotspots
    const testData: Record<string, any[]> = {
      'backsplash': [
        { thumb: '/images/gallery/kitchen/kitchen-backsplashes/century-city-backsplash-1.jpg', full: '/images/gallery/kitchen/kitchen-backsplashes/century-city-backsplash-1.jpg', caption: 'Modern Kitchen Backsplash', width: 1920, height: 1080 }
      ],
      'floor': [
        { thumb: '/images/gallery/living-area/floors/floor-sunset-1.png', full: '/images/gallery/living-area/floors/floor-sunset-1.png', caption: 'Acero Floor - Sunset Project', width: 1920, height: 1080 }
      ],
      'kitchen_countertop': [
        { thumb: '/images/gallery/kitchen/kitchen-countertops/kitchen-countertop-1.png', full: '/images/gallery/kitchen/kitchen-countertops/kitchen-countertop-1.png', caption: 'Modern Kitchen Countertop', width: 1920, height: 1080 }
      ],
      'fireplace': [
        { thumb: '/images/gallery/living-area/fireplaces/fireplace-1.png', full: '/images/gallery/living-area/fireplaces/fireplace-1.png', caption: 'Custom Fireplace Installation', width: 1920, height: 1080 }
      ],
      'kitchen_cabinet': [
        { thumb: '/images/gallery/kitchen/kitchen-cabinets/kitchen-cabinet-naples-1.jpg', full: '/images/gallery/kitchen/kitchen-cabinets/kitchen-cabinet-naples-1.jpg', caption: 'Modern Kitchen Cabinet Installation', width: 1920, height: 1080 }
      ]
    };

    const images = testData[hotspot] || [];
    console.log('🖼️ Found images for', hotspot + ':', images.length);

    // If no images found, return fallback images
    if (images.length === 0) {
      console.log('🖼️ No images found for', hotspot + ', returning fallback');
      return NextResponse.json([
        { thumb: '/images/featured/modern-home.png', full: '/images/featured/modern-home.png', caption: `${hotspot} Project 1`, width: 1920, height: 1080 },
        { thumb: '/images/featured/boutique-store.png', full: '/images/featured/boutique-store.png', caption: `${hotspot} Project 2`, width: 1920, height: 1080 }
      ], { headers });
    }

    // Return the found images
    console.log('🖼️ Returning', images.length, 'images for', hotspot);
    return NextResponse.json(images, { headers });

  } catch (error) {
    // Log the error for debugging
    console.error('🖼️ Gallery API error:', error);
    console.error('🖼️ Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    // Return fallback images on any error
    console.log('🖼️ Returning fallback images due to error');
    return NextResponse.json([
      { thumb: '/images/featured/modern-home.png', full: '/images/featured/modern-home.png', caption: 'Error Fallback', width: 1920, height: 1080 }
    ], { headers });
  }
}

// Handle OPTIONS requests for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
