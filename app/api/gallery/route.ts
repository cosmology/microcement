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

    // Comprehensive gallery data with all actual image paths
    const galleryData: Record<string, any[]> = {
      // KITCHEN AREA
      'kitchen_countertop': [
        { thumb: '/images/gallery/kitchen/kitchen-countertops/kitchen-countertop-1.png', full: '/images/gallery/kitchen/kitchen-countertops/kitchen-countertop-1.png', caption: 'Modern Kitchen Countertop', area: 'Kitchen', category: 'Countertops', folder: 'kitchen', width: 1920, height: 1080 }
      ],
      'backsplash': [
        { thumb: '/images/gallery/kitchen/kitchen-backsplashes/century-city-backsplash-1.jpg', full: '/images/gallery/kitchen/kitchen-backsplashes/century-city-backsplash-1.jpg', caption: 'Modern Kitchen Backsplash', area: 'Kitchen', category: 'Backsplash', folder: 'kitchen', width: 1920, height: 1080 }
      ],
      'island': [
        { thumb: '/images/gallery/kitchen/kitchen-islands/kitchen-island-1.jpg', full: '/images/gallery/kitchen/kitchen-islands/kitchen-island-1.jpg', caption: 'Custom Kitchen Island', area: 'Kitchen', category: 'Island', folder: 'kitchen', width: 1920, height: 1080 }
      ],
      'kitchen_cabinet': [
        { thumb: '/images/gallery/kitchen/kitchen-cabinets/kitchen-cabinet-naples-1.jpg', full: '/images/gallery/kitchen/kitchen-cabinets/kitchen-cabinet-naples-1.jpg', caption: 'Modern Kitchen Cabinet Installation', area: 'Kitchen', category: 'Cabinets', folder: 'kitchen', width: 1920, height: 1080 }
      ],

      // BATHROOM AREA
      'bath_countertop': [
        { thumb: '/images/gallery/bathroom/bathroom-countertops/bathroom-countertop-1.jpg', full: '/images/gallery/bathroom/bathroom-countertops/bathroom-countertop-1.jpg', caption: 'Modern Bathroom Countertop Installation', area: 'Bathroom', category: 'Countertops', folder: 'bathroom', width: 1920, height: 1080 }
      ],
      'bathroom_walls': [
        { thumb: '/images/gallery/bathroom/bathroom-walls/bathroom-wall-1.png', full: '/images/gallery/bathroom/bathroom-walls/bathroom-wall-1.png', caption: 'Bathroom Wall Installation', area: 'Bathroom', category: 'Walls', folder: 'bathroom', width: 1920, height: 1080 }
      ],

      // LIVING AREA
      'floor': [
        { thumb: '/images/gallery/living-area/floors/floor-sunset-1.png', full: '/images/gallery/living-area/floors/floor-sunset-1.png', caption: 'Acero Floor - Sunset Project', area: 'Living Area', category: 'Floors', folder: 'living-area', width: 1920, height: 1080 },
        { thumb: '/images/gallery/living-area/floors/floor-beverly-hills-2.jpg', full: '/images/gallery/living-area/floors/floor-beverly-hills-2.jpg', caption: 'Blanco Rotto - Beverly Hills', area: 'Living Area', category: 'Floors', folder: 'living-area', width: 1920, height: 1080 },
        { thumb: '/images/gallery/living-area/floors/floor-texas-3.jpg', full: '/images/gallery/living-area/floors/floor-texas-3.jpg', caption: 'Lido - Texas Project', area: 'Living Area', category: 'Floors', folder: 'living-area', width: 1920, height: 1080 },
        { thumb: '/images/gallery/living-area/floors/floor-naples-4.png', full: '/images/gallery/living-area/floors/floor-naples-4.png', caption: 'Acero, Blanco Rotto, Trigo Mix - Naples', area: 'Living Area', category: 'Floors', folder: 'living-area', width: 1920, height: 1080 },
        { thumb: '/images/gallery/living-area/floors/floor-beverly-hills-5.jpg', full: '/images/gallery/living-area/floors/floor-beverly-hills-5.jpg', caption: 'Blanco Rotto - Beverly Hills', area: 'Living Area', category: 'Floors', folder: 'living-area', width: 1920, height: 1080 }
      ],
      'fireplace': [
        { thumb: '/images/gallery/living-area/fireplaces/fireplace-1.png', full: '/images/gallery/living-area/fireplaces/fireplace-1.png', caption: 'Custom Fireplace Installation', area: 'Living Area', category: 'Fireplace', folder: 'living-area', width: 1920, height: 1080 }
      ],
      'shelves': [
        { thumb: '/images/gallery/living-area/furniture/furniture-1.png', full: '/images/gallery/living-area/furniture/furniture-1.png', caption: 'Custom Furniture Design', area: 'Living Area', category: 'Furniture', folder: 'living-area', width: 1920, height: 1080 }
      ],
      'coffee_table': [
        { thumb: '/images/gallery/living-area/furniture/furniture-1.png', full: '/images/gallery/living-area/furniture/furniture-1.png', caption: 'Custom Coffee Table Design', area: 'Living Area', category: 'Furniture', folder: 'living-area', width: 1920, height: 1080 }
      ],
      'accent_wall': [
        { thumb: '/images/gallery/living-area/walls/accent-wall-sunset-1.jpg', full: '/images/gallery/living-area/walls/accent-wall-sunset-1.jpg', caption: 'Modern Accent Wall', area: 'Living Area', category: 'Accent Walls', folder: 'living-area', width: 1920, height: 1080 },
        { thumb: '/images/gallery/living-area/walls/wall-beverly-hills-2.jpg', full: '/images/gallery/living-area/walls/wall-beverly-hills-2.jpg', caption: 'Beverly Hills Wall Project', area: 'Living Area', category: 'Accent Walls', folder: 'living-area', width: 1920, height: 1080 }
      ],

      // OUTDOOR AREA
      'outdoor_patio': [
        { thumb: '/images/gallery/outdoor-patio.png', full: '/images/gallery/outdoor-patio.png', caption: 'Outdoor Patio Installation', area: 'Outdoor', category: 'Patio', folder: 'outdoor', width: 1920, height: 1080 }
      ],

      // COMMERCIAL AREAS
      'restaurant_bar': [
        { thumb: '/images/gallery/restaurant-bar.png', full: '/images/gallery/restaurant-bar.png', caption: 'Restaurant Bar Installation', area: 'Commercial', category: 'Bar', folder: 'commercial', width: 1920, height: 1080 }
      ],
      'staircase': [
        { thumb: '/images/gallery/staircase.png', full: '/images/gallery/staircase.png', caption: 'Custom Staircase Design', area: 'Commercial', category: 'Staircase', folder: 'commercial', width: 1920, height: 1080 }
      ]
    };

    const images = galleryData[hotspot] || [];
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
