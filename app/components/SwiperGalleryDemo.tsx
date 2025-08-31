'use client';

import React, { useState } from 'react';
import SwiperGallery, { GalleryImage } from './SwiperGallery';

// Sample gallery data
const sampleImages: GalleryImage[] = [
  {
    thumb: '/images/gallery/kitchen-countertop-1-thumb.jpg',
    full: '/images/gallery/kitchen-countertop-1.jpg',
    caption: 'Modern Kitchen Countertop Installation'
  },
  {
    thumb: '/images/gallery/kitchen-countertop-2-thumb.jpg',
    full: '/images/gallery/kitchen-countertop-2.jpg',
    caption: 'Granite Countertop with Undermount Sink'
  },
  {
    thumb: '/images/gallery/kitchen-countertop-3-thumb.jpg',
    full: '/images/gallery/kitchen-countertop-3.jpg',
    caption: 'Quartz Countertop with Waterfall Edge'
  },
  {
    thumb: '/images/gallery/kitchen-island-1-thumb.jpg',
    full: '/images/gallery/kitchen-island-1.jpg',
    caption: 'Large Kitchen Island with Seating'
  },
  {
    thumb: '/images/gallery/kitchen-island-2-thumb.jpg',
    full: '/images/gallery/kitchen-island-2.jpg',
    caption: 'Modern Kitchen Island with Storage'
  },
  {
    thumb: '/images/gallery/fireplace-1-thumb.jpg',
    full: '/images/gallery/fireplace-1.jpg',
    caption: 'Stone Fireplace Surround'
  }
];

const SwiperGalleryDemo: React.FC = () => {
  const [gridOnlyMode, setGridOnlyMode] = useState(false);
  const [externalTrigger, setExternalTrigger] = useState(false);

  const handleClose = () => {
    console.log('Gallery closed');
    setExternalTrigger(false);
  };

  return (
    <div className="p-8 space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">SwiperGallery Demo</h1>
        <p className="text-gray-600 mb-6">A reusable gallery component with grid and modal modes</p>
        
        {/* Mode Toggle */}
        <div className="flex justify-center gap-4 mb-8">
          <button
            onClick={() => setGridOnlyMode(false)}
            className={`px-4 py-2 rounded-lg transition-colors ${
              !gridOnlyMode 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Modal + Fullscreen Mode
          </button>
          <button
            onClick={() => setGridOnlyMode(true)}
            className={`px-4 py-2 rounded-lg transition-colors ${
              gridOnlyMode 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Grid Only Mode
          </button>
        </div>

        {/* External Trigger Button */}
        {!gridOnlyMode && (
          <button
            onClick={() => setExternalTrigger(true)}
            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors mb-8"
          >
            Open Gallery Externally
          </button>
        )}
      </div>

      {/* Gallery Component */}
      <div className="max-w-6xl mx-auto">
        <SwiperGallery
          images={sampleImages}
          onClose={handleClose}
          mode={gridOnlyMode ? 'grid-only' : 'modal-fullscreen'}
          triggerModal={externalTrigger}
          className="bg-white p-6 rounded-xl shadow-lg"
        />
      </div>

      {/* Usage Instructions */}
      <div className="max-w-4xl mx-auto bg-gray-50 p-6 rounded-xl">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Usage Instructions</h2>
        
        <div className="space-y-4 text-sm text-gray-700">
          <div>
            <h3 className="font-medium text-gray-900">Props:</h3>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li><code>images</code>: Array of GalleryImage objects with thumb, full, and optional caption</li>
              <li><code>onClose</code>: Function called when gallery/modal is closed</li>
              <li><code>mode</code>: 'grid-only' or 'modal-fullscreen'</li>
              <li><code>triggerModal</code>: External trigger for opening modal</li>
              <li><code>className</code>: Additional CSS classes</li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-medium text-gray-900">Features:</h3>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>Responsive grid layout (2-5 columns based on screen size)</li>
              <li>Fullscreen modal with Swiper.js navigation</li>
              <li>Pinch-to-zoom support on touch devices</li>
              <li>Keyboard navigation (ESC to close)</li>
              <li>Smooth transitions and hover effects</li>
              <li>Caption overlay in fullscreen mode</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SwiperGalleryDemo; 