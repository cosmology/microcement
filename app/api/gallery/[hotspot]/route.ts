import { NextRequest, NextResponse } from 'next/server';

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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ hotspot: string }> }
) {
  try {
    const { hotspot } = await params;
    

    console.log('🖼️ Gallery API called with hotspot:', hotspot);
    console.log('🖼️ Available hotspots:', Object.keys(GALLERY_DATA));
    console.log('🖼️ Request URL:', request.url);
    console.log('🖼️ Environment:', process.env.NODE_ENV);
    
    // Get images for the specific hotspot
    const images = GALLERY_DATA[hotspot] || [];
    
    console.log('🖼️ Found images:', images.length);
    
    // If no images found, return placeholder images
    if (images.length === 0) {
      console.log('🖼️ No images found, returning placeholders');
      const placeholderImages: GalleryImage[] = [
        { thumb: '/images/featured/modern-home.png', full: '/images/featured/modern-home.png', caption: `${hotspot} Project 1`, area: 'General', category: 'General', folder: 'general', width: 1920, height: 1080 },
        { thumb: '/images/featured/boutique-store.png', full: '/images/featured/boutique-store.png', caption: `${hotspot} Project 2`, area: 'General', category: 'General', folder: 'general', width: 1920, height: 1080 },
        { thumb: '/images/featured/hotel-lobby.png', full: '/images/featured/hotel-lobby.png', caption: `${hotspot} Project 3`, area: 'General', category: 'General', folder: 'general', width: 1920, height: 1080 },
      ];
      
      return NextResponse.json(placeholderImages, {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=3600',
        },
      });
    }
    
    console.log('🖼️ Returning', images.length, 'images for hotspot:', hotspot);
    return NextResponse.json(images, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600',
      },
    });

    // Get images for the specific hotspot
    const images = GALLERY_DATA[hotspot] || [];
    
    // If no images found, return placeholder images
    if (images.length === 0) {
      const placeholderImages: GalleryImage[] = [
        { thumb: '/images/featured/modern-home.png', full: '/images/featured/modern-home.png', caption: `${hotspot} Project 1`, area: 'General', category: 'General', folder: 'general', width: 1920, height: 1080 },
        { thumb: '/images/featured/boutique-store.png', full: '/images/featured/boutique-store.png', caption: `${hotspot} Project 2`, area: 'General', category: 'General', folder: 'general', width: 1920, height: 1080 },
        { thumb: '/images/featured/hotel-lobby.png', full: '/images/featured/hotel-lobby.png', caption: `${hotspot} Project 3`, area: 'General', category: 'General', folder: 'general', width: 1920, height: 1080 },
      ];
      
      return NextResponse.json(placeholderImages);
    }
    
    return NextResponse.json(images);

  } catch (error) {
    console.error('Error loading gallery images:', error);
    
    // Return placeholder images on error
    const fallbackImages: GalleryImage[] = [
      { thumb: '/images/featured/modern-home.png', full: '/images/featured/modern-home.png', caption: 'Project 1', area: 'General', category: 'General', folder: 'general', width: 1920, height: 1080 },
      { thumb: '/images/featured/boutique-store.png', full: '/images/featured/boutique-store.png', caption: 'Project 2', area: 'General', category: 'General', folder: 'general', width: 1920, height: 1080 },
      { thumb: '/images/featured/hotel-lobby.png', full: '/images/featured/hotel-lobby.png', caption: 'Project 3', area: 'General', category: 'General', folder: 'general', width: 1920, height: 1080 },
    ];

    return NextResponse.json(fallbackImages, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  }
} 