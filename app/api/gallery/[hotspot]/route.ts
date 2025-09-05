import { NextRequest, NextResponse } from 'next/server';

// Ensure this API route is always dynamic on Vercel/Next production
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Define the gallery image structure
interface GalleryImage {
  thumb: string;
  full: string;
  caption: string;
  area?: string;
  category?: string;
  folder?: string;
  width?: number;
  height?: number;
}

// Gallery data mapping organized by tour areas - matching exact hotspot names from ScrollScene
const GALLERY_DATA: Record<string, GalleryImage[]> = {
  // KITCHEN AREA
  'kitchen_countertop': [
    { thumb: '/images/gallery/kitchen/kitchen-countertops/kitchen-countertop-1.png', full: '/images/gallery/kitchen/kitchen-countertops/kitchen-countertop-1.png', caption: 'Modern Kitchen Countertop', area: 'Kitchen', category: 'Countertops', folder: 'kitchen', width: 1920, height: 1080 },
  ],
  'backsplash': [
    { thumb: '/images/gallery/kitchen/kitchen-backsplashes/century-city-backsplash-1.jpg', full: '/images/gallery/kitchen/kitchen-backsplashes/century-city-backsplash-1.jpg', caption: 'Modern Kitchen Backsplash', area: 'Kitchen', category: 'Backsplash', folder: 'kitchen', width: 1920, height: 1080 },
  ],
  'island': [
    { thumb: '/images/gallery/kitchen/kitchen-islands/kitchen-island-1.jpg', full: '/images/gallery/kitchen/kitchen-islands/kitchen-island-1.jpg', caption: 'Custom Kitchen Island', area: 'Kitchen', category: 'Island', folder: 'kitchen', width: 1920, height: 1080 },
  ],
  'kitchen_cabinet': [
    { thumb: '/images/gallery/kitchen/kitchen-cabinets/kitchen-cabinet-naples-1.jpg', full: '/images/gallery/kitchen/kitchen-cabinets/kitchen-cabinet-naples-1.jpg', caption: 'Modern Kitchen Cabinet Installation', area: 'Kitchen', category: 'Cabinets', folder: 'kitchen', width: 1920, height: 1080 },
  ],

  // BATHROOM AREA
  'bath_countertop': [
    { thumb: '/images/gallery/bathroom/bathroom-countertops/bathroom-countertop-1.jpg', full: '/images/gallery/bathroom/bathroom-countertops/bathroom-countertop-1.jpg', caption: 'Modern Bathroom Countertop Installation', area: 'Bathroom', category: 'Countertops', folder: 'bathroom', width: 1920, height: 1080 },
  ],
  'bathroom_walls': [
    { thumb: '/images/gallery/bathroom/bathroom-walls/bathroom-wall-1.png', full: '/images/gallery/bathroom/bathroom-walls/bathroom-wall-1.png', caption: 'Bathroom Wall Installation', area: 'Bathroom', category: 'Walls', folder: 'bathroom', width: 1920, height: 1080 },
  ],

  // LIVING AREA
  'floor': [
    { thumb: '/images/gallery/living-area/floors/floor-sunset-1.png', full: '/images/gallery/living-area/floors/floor-sunset-1.png', caption: 'Acero Floor - Sunset Project', area: 'Living Area', category: 'Floors', folder: 'living-area', width: 1920, height: 1080 },
    { thumb: '/images/gallery/living-area/floors/floor-beverly-hills-2.jpg', full: '/images/gallery/living-area/floors/floor-beverly-hills-2.jpg', caption: 'Blanco Rotto - Beverly Hills', area: 'Living Area', category: 'Floors', folder: 'living-area', width: 1920, height: 1080 },
    { thumb: '/images/gallery/living-area/floors/floor-texas-3.jpg', full: '/images/gallery/living-area/floors/floor-texas-3.jpg', caption: 'Lido - Texas Project', area: 'Living Area', category: 'Floors', folder: 'living-area', width: 1920, height: 1080 },
    { thumb: '/images/gallery/living-area/floors/floor-naples-4.png', full: '/images/gallery/living-area/floors/floor-naples-4.png', caption: 'Acero, Blanco Rotto, Trigo Mix - Naples', area: 'Living Area', category: 'Floors', folder: 'living-area', width: 1920, height: 1080 },
    { thumb: '/images/gallery/living-area/floors/floor-beverly-hills-5.jpg', full: '/images/gallery/living-area/floors/floor-beverly-hills-5.jpg', caption: 'Blanco Rotto - Beverly Hills', area: 'Living Area', category: 'Floors', folder: 'living-area', width: 1920, height: 1080 },
  ],
  'fireplace': [
    { thumb: '/images/gallery/living-area/fireplaces/fireplace-1.png', full: '/images/gallery/living-area/fireplaces/fireplace-1.png', caption: 'Custom Fireplace Installation', area: 'Living Area', category: 'Fireplace', folder: 'living-area', width: 1920, height: 1080 },
  ],
  'shelves': [
    { thumb: '/images/gallery/living-area/furniture/furniture-1.png', full: '/images/gallery/living-area/furniture/furniture-1.png', caption: 'Custom Furniture Design', area: 'Living Area', category: 'Furniture', folder: 'living-area', width: 1920, height: 1080 },
  ],
  'coffee_table': [
    { thumb: '/images/gallery/living-area/furniture/furniture-1.png', full: '/images/gallery/living-area/furniture/furniture-1.png', caption: 'Custom Coffee Table Design', area: 'Living Area', category: 'Furniture', folder: 'living-area', width: 1920, height: 1080 },
  ],
  'accent_wall': [
    { thumb: '/images/gallery/living-area/walls/accent-wall-sunset-1.jpg', full: '/images/gallery/living-area/walls/accent-wall-sunset-1.jpg', caption: 'Modern Accent Wall', area: 'Living Area', category: 'Accent Walls', folder: 'living-area', width: 1920, height: 1080 },
  ],
};

// Default fallback images
const FALLBACK_IMAGES: GalleryImage[] = [
  { thumb: '/images/featured/modern-home.png', full: '/images/featured/modern-home.png', caption: 'Project 1', area: 'General', category: 'General', folder: 'general', width: 1920, height: 1080 },
  { thumb: '/images/featured/boutique-store.png', full: '/images/featured/boutique-store.png', caption: 'Project 2', area: 'General', category: 'General', folder: 'general', width: 1920, height: 1080 },
  { thumb: '/images/featured/hotel-lobby.png', full: '/images/featured/hotel-lobby.png', caption: 'Project 3', area: 'General', category: 'General', folder: 'general', width: 1920, height: 1080 },
];

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ hotspot: string }> }
) {
  // Add CORS headers for Vercel
  const headers = {
    'Content-Type': 'application/json',
    'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  try {
    // Log request details for debugging
    console.log('🖼️ ===== GALLERY API CALLED =====');
    console.log('🖼️ Request URL:', request.url);
    console.log('🖼️ Pathname:', request.nextUrl?.pathname);
    console.log('🖼️ Search Params:', request.nextUrl?.searchParams?.toString?.() || '');
    console.log('🖼️ Environment:', process.env.NODE_ENV);
    console.log('🖼️ Vercel:', process.env.VERCEL === '1' ? 'Yes' : 'No');
    console.log('🖼️ Region:', process.env.VERCEL_REGION || 'Unknown');
    console.log('🖼️ ================================');

    // Await the params Promise (Next.js 15 requirement)
    const resolvedParams = await params;
    const hotspot: string | undefined = resolvedParams?.hotspot;
    console.log('🖼️ Hotspot requested:', hotspot);
    console.log('🖼️ Available hotspots:', Object.keys(GALLERY_DATA));

    // Validate hotspot parameter
    if (!hotspot || typeof hotspot !== 'string') {
      console.log('🖼️ Invalid hotspot parameter, returning fallback');
      return NextResponse.json(FALLBACK_IMAGES, { headers });
    }

    // Normalize hotspot (defensive: trim, lowercase) for matching
    const normalized = hotspot.trim().toLowerCase();
    console.log('🖼️ Hotspot normalized:', normalized);
    // Get images for the specific hotspot
    const images = GALLERY_DATA[normalized] || GALLERY_DATA[hotspot] || [];
    console.log('🖼️ Found images for', hotspot + ':', images.length);

    // If no images found, return fallback images
    if (images.length === 0) {
      console.log('🖼️ No images found for', hotspot + ', returning fallback');
      const placeholderImages = FALLBACK_IMAGES.map((img, index) => ({
        ...img,
        caption: `${hotspot} Project ${index + 1}`
      }));
      return NextResponse.json(placeholderImages, { headers });
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
    return NextResponse.json(FALLBACK_IMAGES, { headers });
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