import { NextRequest, NextResponse } from 'next/server';

// Mock data for different hotspots
const hotspotGalleries: { [key: string]: Array<{
  id: string;
  src: string;
  alt: string;
  thumbnail: string;
  category: string;
}> } = {
    'Hotspot_geo_accent_wall': [
    {
      id: '1',
      src: '/images/gallery/living-area/walls/accent-wall-sunset-1.jpg',
      alt: 'Modern Accent Wall',
      thumbnail: '/images/gallery/living-area/walls/accent-wall-sunset-1.jpg',
      category: 'Accent Walls'
    },
  ],
    'Hotspot_geo_backsplash': [
    {
      id: '1',
      src: '/images/gallery/kitchen/kitchen-backsplashes/century-city-backsplash-1.jpg',
      alt: 'Modern Kitchen Backsplash',
      thumbnail: '/images/gallery/kitchen/kitchen-backsplashes/century-city-backsplash-1.jpg',
      category: 'Kitchen Backsplashes'
    },
  ],
  'Hotspot_geo_kitchen_countertop': [
    {
      id: '1',
      src: '/images/gallery/kitchen/kitchen-countertops/kitchen-countertop-1.png',
      alt: 'Modern Kitchen Countertop',
      thumbnail: '/images/gallery/kitchen/kitchen-countertops/kitchen-countertop-1.png',
      category: 'Kitchen Countertops'
    },
  ],
  'Hotspot_geo_kitchen_cabinet': [
    {
      id: '1',
      src: '/images/gallery/kitchen/kitchen-cabinets/kitchen-cabinet-naples-1.jpg',
      alt: 'Modern Kitchen Cabinet Installation',
      thumbnail: '/images/gallery/kitchen/kitchen-cabinets/kitchen-cabinet-naples-1.jpg',
      category: 'Kitchen Cabinets'
    },
  ],
  'Hotspot_geo_fireplace': [
    {
      id: '1',
      src: '/images/gallery/living-area/fireplaces/fireplace-1.png',
      alt: 'Custom Fireplace Installation',
      thumbnail: '/images/gallery/living-area/fireplaces/fireplace-1.png',
      category: 'Fireplaces'
    },
  ],
  'Hotspot_geo_island': [
    {
      id: '1',
      src: '/images/gallery/kitchen/kitchen-islands/kitchen-island-1.jpg',
      alt: 'Custom Kitchen Island',
      thumbnail: '/images/gallery/kitchen/kitchen-islands/kitchen-island-1.jpg',
      category: 'Kitchen Islands'
    },
  ],
  'Hotspot_geo_bath_countertop': [
    {
        id: '1',
        src: '/images/gallery/bathroom/bathroom-countertops/bathroom-countertop-1.jpg',
        alt: 'Modern Bathroom Countertop Installation',
        thumbnail: '/images/gallery/bathroom/bathroom-countertops/bathroom-countertop-1.jpg',
        category: 'Bathroom Countertops'
    },
  ],
  'Hotspot_geo_floor': [
    {
        id: '1',
        src: '/images/gallery/living-area/floors/floor-sunset-1.png',
        alt: 'Acero Floor',
        thumbnail: '/images/gallery/living-area/floors/floor-sunset-1.png',
        category: 'Floors'
    },
    {
        id: '2', 
        src: '/images/gallery/living-area/floors/floor-beverly-hills-2.jpg',
        alt: 'Blanco Rotto',
        thumbnail: '/images/gallery/living-area/floors/floor-beverly-hills-2.jpg',
        category: 'Floors'
    },
    {
        id: '3', 
        src: '/images/gallery/living-area/floors/floor-texas-3.jpg',
        alt: 'Lido',
        thumbnail: '/images/gallery/living-area/floors/floor-texas-3.jpg',
        category: 'Floors'
    },
    {
        id: '4', 
        src: '/images/gallery/living-area/floors/floor-naples-4.png',
        alt: 'Acero, Blanco Rotto, Trigo Mix',
        thumbnail: '/images/gallery/living-area/floors/floor-naples-4.png',
        category: 'Floors'
    },
    {
        id: '5', 
        src: '/images/gallery/living-area/floors/floor-beverly-hills-5.jpg',
        alt: 'Blanco Rotto',
        thumbnail: '/images/gallery/living-area/floors/floor-beverly-hills-5.jpg',
        category: 'Floors'
    }
    ]
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ hotspot: string }> }
) {
  const { hotspot } = await params;
  
  try {
    // Get gallery for the specific hotspot
    const gallery = hotspotGalleries[hotspot] || [];
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return NextResponse.json(gallery);
  } catch (error) {
    console.error('Gallery API error:', error);
    return NextResponse.json(
      { error: 'Failed to load gallery' },
      { status: 500 }
    );
  }
} 