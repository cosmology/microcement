# SwiperGallery Installation Guide

## 📦 Required Dependencies

The SwiperGallery component requires the following packages:

### 1. Install Swiper.js
```bash
npm install swiper
```

### 2. Verify Existing Dependencies
The following packages are already installed in your project:
- ✅ `lucide-react` - For icons (ChevronLeft, ChevronRight, X)
- ✅ `tailwindcss` - For styling
- ✅ `react` & `react-dom` - Core React dependencies

## 🔧 Integration with ScrollScene

### Option 1: Replace Existing Gallery System

Replace the current gallery implementation in `ScrollScene.tsx`:

```tsx
// Remove these imports
// import { Swiper, SwiperSlide } from 'swiper/react';
// import { Navigation, Pagination, Zoom } from 'swiper/modules';

// Add this import
import SwiperGallery, { GalleryImage } from './SwiperGallery';

// Replace the existing gallery state with:
const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([]);

// Replace the loadGalleryImages function:
const loadGalleryImages = async (hotspotName: string) => {
  try {
    setGalleryLoading(true);
    const response = await fetch(`/api/gallery/${hotspotName}`);
    const data = await response.json();
    
    // Transform API data to GalleryImage format
    const transformedImages: GalleryImage[] = data.map((img: any) => ({
      thumb: img.thumbnail,
      full: img.src,
      caption: img.alt
    }));
    
    setGalleryImages(transformedImages);
  } catch (error) {
    console.error('Failed to load gallery:', error);
    // Fallback to placeholder images
    setGalleryImages(getPlaceholderImages(hotspotName));
  } finally {
    setGalleryLoading(false);
  }
};

// Replace the gallery JSX with:
{galleryVisible && (
  <div className="fixed inset-0 z-[50] flex items-center justify-center p-4">
    <div className="relative w-full h-full max-w-6xl">
      <SwiperGallery
        images={galleryImages}
        onClose={closeGallery}
        mode="modal-fullscreen"
        className="w-full h-full"
      />
    </div>
  </div>
)}
```

### Option 2: Use as Standalone Component

Create a new page or section to showcase the gallery:

```tsx
// app/gallery/page.tsx
import SwiperGallery, { GalleryImage } from '../components/SwiperGallery';

const sampleImages: GalleryImage[] = [
  {
    thumb: '/images/gallery/kitchen-countertop-1-thumb.jpg',
    full: '/images/gallery/kitchen-countertop-1.jpg',
    caption: 'Modern Kitchen Countertop Installation'
  },
  // ... more images
];

export default function GalleryPage() {
  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">Project Gallery</h1>
      <SwiperGallery
        images={sampleImages}
        onClose={() => console.log('Gallery closed')}
        mode="modal-fullscreen"
      />
    </div>
  );
}
```

## 🎯 Usage Examples

### Basic Gallery
```tsx
<SwiperGallery
  images={images}
  onClose={handleClose}
  mode="modal-fullscreen"
/>
```

### Grid-Only Display
```tsx
<SwiperGallery
  images={images}
  onClose={handleClose}
  mode="grid-only"
  className="my-custom-gallery"
/>
```

### External Modal Trigger
```tsx
const [showGallery, setShowGallery] = useState(false);

<SwiperGallery
  images={images}
  onClose={() => setShowGallery(false)}
  mode="modal-fullscreen"
  triggerModal={showGallery}
/>

<button onClick={() => setShowGallery(true)}>
  View Gallery
</button>
```

## 🚨 Troubleshooting

### Common Issues

1. **Swiper CSS not loading**
   - Ensure Swiper is installed: `npm install swiper`
   - Check that CSS imports are working

2. **TypeScript errors**
   - Verify TypeScript version is 4.9+
   - Check that all imports are correct

3. **Styling conflicts**
   - Ensure Tailwind CSS is properly configured
   - Check for conflicting CSS classes

### Performance Tips

1. **Image Optimization**
   - Use WebP format for thumbnails
   - Implement lazy loading for large galleries
   - Compress images appropriately

2. **Bundle Size**
   - Swiper.js adds ~50KB to your bundle
   - Consider dynamic imports for large galleries

## 🔄 Migration from Current Gallery

### Step 1: Install Dependencies
```bash
npm install swiper
```

### Step 2: Update Imports
```tsx
// Old imports
// import { Swiper, SwiperSlide } from 'swiper/react';

// New imports
import SwiperGallery, { GalleryImage } from './SwiperGallery';
```

### Step 3: Transform Data
```tsx
// Transform your existing image data to GalleryImage format
const transformedImages: GalleryImage[] = existingImages.map(img => ({
  thumb: img.thumbnail || img.src,
  full: img.src,
  caption: img.alt || img.caption
}));
```

### Step 4: Replace JSX
```tsx
// Replace complex gallery JSX with:
<SwiperGallery
  images={transformedImages}
  onClose={closeGallery}
  mode="modal-fullscreen"
/>
```

## 📱 Testing

### Test the Component
1. **Grid Mode**: Verify thumbnails display correctly
2. **Modal Mode**: Click thumbnails to open fullscreen
3. **Navigation**: Test arrow buttons and pagination
4. **Touch**: Test pinch-zoom on mobile devices
5. **Keyboard**: Test ESC key and tab navigation

### Browser Compatibility
- ✅ Chrome/Edge (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ✅ Mobile browsers (iOS/Android)

## 🎉 Success!

Once installed and integrated, you'll have:
- ✨ Professional gallery with smooth animations
- 📱 Touch-friendly mobile experience
- 🎨 Customizable styling with Tailwind
- 🔧 Reusable component for other projects
- 📊 Better performance than custom implementations 