# SwiperGallery Component

A reusable React gallery component built with Swiper.js that provides both grid-only and modal-fullscreen modes with smooth animations and touch support.

## 🚀 Features

- **Dual Modes**: Grid-only display or interactive modal with fullscreen swiper
- **Responsive Design**: Adaptive grid layout (2-5 columns based on screen size)
- **Touch Support**: Pinch-to-zoom, swipe navigation on mobile devices
- **Keyboard Navigation**: ESC key to close modal
- **Smooth Animations**: Hover effects, transitions, and staggered thumbnail animations
- **Accessibility**: Proper ARIA labels and keyboard navigation
- **Customizable**: Flexible props for different use cases

## 📦 Installation

### Dependencies
```bash
npm install swiper lucide-react
```

### CSS Imports
The component automatically imports required Swiper CSS:
```typescript
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import 'swiper/css/zoom';
```

## 🎯 Usage

### Basic Implementation

```tsx
import SwiperGallery, { GalleryImage } from './components/SwiperGallery';

const images: GalleryImage[] = [
  {
    thumb: '/path/to/thumbnail.jpg',
    full: '/path/to/full-image.jpg',
    caption: 'Image Description'
  }
];

function MyComponent() {
  const handleClose = () => {
    console.log('Gallery closed');
  };

  return (
    <SwiperGallery
      images={images}
      onClose={handleClose}
      mode="modal-fullscreen"
    />
  );
}
```

### Grid-Only Mode

```tsx
<SwiperGallery
  images={images}
  onClose={handleClose}
  mode="grid-only"
  className="my-custom-class"
/>
```

### External Modal Trigger

```tsx
const [showModal, setShowModal] = useState(false);

<SwiperGallery
  images={images}
  onClose={() => setShowModal(false)}
  mode="modal-fullscreen"
  triggerModal={showModal}
/>

<button onClick={() => setShowModal(true)}>
  Open Gallery
</button>
```

## 🔧 Props

### SwiperGalleryProps

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `images` | `GalleryImage[]` | **Required** | Array of image objects |
| `onClose` | `() => void` | **Required** | Function called when gallery/modal closes |
| `mode` | `'grid-only' \| 'modal-fullscreen'` | `'modal-fullscreen'` | Gallery display mode |
| `triggerModal` | `boolean` | `false` | External trigger for opening modal |
| `className` | `string` | `''` | Additional CSS classes |

### GalleryImage Interface

```typescript
interface GalleryImage {
  thumb: string;      // Thumbnail image URL
  full: string;       // Full-size image URL
  caption?: string;   // Optional image caption
}
```

## 🎨 Styling

### CSS Classes

The component uses Tailwind CSS classes and can be customized with:

- **Grid Layout**: Responsive grid with automatic column adjustment
- **Hover Effects**: Scale, shadow, and overlay animations
- **Modal Styling**: Dark backdrop, rounded corners, smooth transitions
- **Navigation**: Custom arrow buttons with backdrop blur
- **Pagination**: Dynamic bullet indicators

### Custom Styling

```tsx
<SwiperGallery
  images={images}
  onClose={handleClose}
  className="bg-white p-6 rounded-xl shadow-lg border"
/>
```

## 📱 Responsive Behavior

| Screen Size | Grid Columns | Features |
|-------------|--------------|----------|
| Mobile (< 768px) | 2 columns | Touch gestures, pinch-zoom |
| Tablet (768px - 1024px) | 3 columns | Touch + mouse support |
| Desktop (1024px - 1280px) | 4 columns | Full feature set |
| Large Desktop (> 1280px) | 5 columns | Optimal spacing |

## 🎬 Animation Features

### Thumbnail Animations
- **Hover Scale**: 1.05x scale on hover
- **Image Zoom**: 1.1x scale on image hover
- **Overlay Fade**: Gradient overlay appears on hover
- **Smooth Transitions**: 300ms duration for all animations

### Modal Animations
- **Backdrop Blur**: Semi-transparent background with blur effect
- **Swiper Transitions**: Smooth slide transitions with easing
- **Zoom Support**: Pinch-to-zoom on touch devices
- **Navigation Fade**: Arrow buttons with backdrop blur

## 🔍 Swiper.js Integration

### Modules Used
- **Navigation**: Previous/Next arrow buttons
- **Pagination**: Dynamic bullet indicators
- **Zoom**: Pinch-to-zoom functionality

### Custom Navigation
```tsx
// Custom navigation buttons with backdrop blur
<button className="swiper-button-prev absolute left-4 top-1/2 transform -translate-y-1/2 z-10 w-12 h-12 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center transition-all duration-200 backdrop-blur-sm">
  <ChevronLeft className="w-6 h-6" />
</button>
```

## 🎯 Use Cases

### 1. Portfolio Gallery
```tsx
<SwiperGallery
  images={portfolioImages}
  onClose={handlePortfolioClose}
  mode="modal-fullscreen"
/>
```

### 2. Product Images
```tsx
<SwiperGallery
  images={productImages}
  onClose={handleProductClose}
  mode="grid-only"
  className="product-gallery"
/>
```

### 3. Photo Collection
```tsx
<SwiperGallery
  images={photoCollection}
  onClose={handlePhotoClose}
  mode="modal-fullscreen"
  triggerModal={showPhotoGallery}
/>
```

## 🚨 Error Handling

### Image Fallbacks
```tsx
onError={(e) => {
  (e.target as HTMLImageElement).src = '/placeholder.svg';
}}
```

### Loading States
- Thumbnails load progressively
- Modal opens only after images are ready
- Graceful fallback for failed images

## 🔒 Accessibility

### Keyboard Navigation
- **ESC**: Close modal
- **Tab**: Navigate between interactive elements
- **Enter/Space**: Activate buttons

### Screen Reader Support
- Proper alt text for images
- ARIA labels for navigation
- Semantic HTML structure

## 🧪 Testing

### Component Testing
```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import SwiperGallery from './SwiperGallery';

test('opens modal when thumbnail is clicked', () => {
  render(<SwiperGallery images={testImages} onClose={jest.fn()} />);
  
  const thumbnail = screen.getByAltText('Test Image');
  fireEvent.click(thumbnail);
  
  expect(screen.getByRole('dialog')).toBeInTheDocument();
});
```

## 📚 Examples

See `SwiperGalleryDemo.tsx` for a complete working example with:
- Mode switching
- External modal triggers
- Sample image data
- Usage instructions

## 🤝 Contributing

### Code Style
- TypeScript for type safety
- Functional components with hooks
- Tailwind CSS for styling
- Lucide React for icons

### Component Structure
```
SwiperGallery/
├── SwiperGallery.tsx      # Main component
├── SwiperGalleryDemo.tsx  # Demo/example
└── README-SwiperGallery.md # Documentation
```

## 📄 License

This component is part of the microcement project and follows the same licensing terms. 