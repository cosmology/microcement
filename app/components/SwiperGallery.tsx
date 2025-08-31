'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, Zoom } from 'swiper/modules';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { AspectRatio } from '../../components/ui/aspect-ratio';

// Import Swiper styles
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import 'swiper/css/zoom';

// Types
export interface GalleryImage {
  thumb: string;
  full: string;
  caption?: string;
  width?: number;
  height?: number;
}

// Helper function to detect image orientation and get appropriate aspect ratio
const getImageAspectRatio = (image: GalleryImage): number => {
  // Use actual image aspect ratio instead of fixed ratios
  if (image.width && image.height) {
    const ratio = image.width / image.height;
    // console.log(`📐 Image: ${image.width}×${image.height}, Aspect Ratio: ${ratio.toFixed(2)}:1`);
    return ratio;
  }
  // console.log(`📐 No dimensions available, using fallback ratio: 2:3`);
  return 2/3; // Fallback for images without dimensions
};

// Helper function to get object-fit style for maximum coverage
const getObjectFitStyle = (image: GalleryImage): "cover" => {
  // Always use 'cover' to fill entire container
  // This ensures the longer side determines the bounds
  // console.log(`🎯 Using object-fit: cover for maximum real estate`);
  return 'cover';
};


interface SwiperGalleryProps {
  images: GalleryImage[];
  onClose: () => void;
  mode?: 'grid-only' | 'modal-fullscreen';
  triggerModal?: boolean; // External trigger for modal
  className?: string;
}

interface SwiperModalProps {
  images: GalleryImage[];
  onClose: () => void;
  initialSlide?: number;
}

// SwiperModal Component
const SwiperModal: React.FC<SwiperModalProps> = ({ images, onClose, initialSlide = 0 }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [loadedImages, setLoadedImages] = useState<Set<number>>(new Set());
  const [currentSlide, setCurrentSlide] = useState(initialSlide);
  const [swiper, setSwiper] = useState<any>(null);

  useEffect(() => {
    // Reset loading state when images change
    setIsLoading(true);
    setLoadedImages(new Set());
    
    // Set a timeout to prevent infinite loading
    const timeout = setTimeout(() => {
      setIsLoading(false);
    }, 10000); // 10 second timeout
    
    return () => clearTimeout(timeout);
  }, [images]);

  const handleImageLoad = (index: number) => {
    setLoadedImages(prev => {
      const newSet = new Set([...prev, index]);
      
      // Check if all images are loaded
      if (newSet.size >= images.length) {
        setIsLoading(false);
      }
      
      return newSet;
    });
  };

  const handleImageError = (index: number) => {
    // Mark as loaded even if it's an error to prevent infinite loading
    setLoadedImages(prev => {
      const newSet = new Set([...prev, index]);
      
      // Check if all images are loaded
      if (newSet.size >= images.length) {
        setIsLoading(false);
      }
      
      return newSet;
    });
  };

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEsc);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = 'unset';
    };
  }, [onClose]);

  const handleBackgroundClick = (e: React.MouseEvent) => {
    // Only close if clicking the background, not child elements
    console.log('🎯 Background clicked:', e.target === e.currentTarget);
    console.log('🎯 Target element:', e.target);
    console.log('🎯 Current target:', e.currentTarget);
    
    if (e.target === e.currentTarget) {
      console.log('✅ Closing modal via background click');
      onClose();
    }
  };

  const handleBackToPathClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('🔄 Back-to-Path arrow clicked!');
    
    try {
      // First: Close the gallery
      console.log('1️⃣ Closing gallery...');
      onClose();
      
      // Note: continueJourney will be called by the onClose function in ScrollScene
      // which calls closeGallery() -> disableSceneMouseEvents(false) -> continueJourney()
      console.log('✅ Back-to-Path sequence initiated');
    } catch (error) {
      console.error('❌ Error executing Back-to-Path:', error);
    }
  };

  const goToPrev = () => {
    if (swiper) {
      swiper.slidePrev();
    }
  };

  const goToNext = () => {
    if (swiper) {
      swiper.slideNext();
    }
  };

  const goToSlide = (index: number) => {
    if (swiper) {
      swiper.slideTo(index);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ pointerEvents: 'none' }}
    >
      {/* Full Screen Backdrop */}
      <div className="gallery-backdrop" style={{ pointerEvents: 'auto' }}></div>
      
      {/* Loading Spinner */}
      {isLoading && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="flex flex-col items-center space-y-4 bg-black/80 rounded-2xl p-8 border border-white/20">
            <div className="w-16 h-16 border-4 border-white/20 border-t-purple-400 rounded-full animate-spin"></div>
            <div className="text-white text-lg font-medium text-center">
              <div>Loading images...</div>
              <div className="text-purple-300 text-sm mt-2">
                {loadedImages.size} / {images.length} loaded
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Gallery Content with Custom CSS Variables */}
      <div className="gallery-modal" style={{ pointerEvents: 'auto' }}>
        {/* Inner Container with Round Corners and Dark Background */}
        <div 
          className="w-full h-full rounded-xl"
          style={{
            background: 'rgba(13, 16, 27, 0.9)',
            borderRadius: '12px',
            border: 'none'
          }}
        >
        {/* Return to Path Button */}
        <button
          onClick={onClose}
          className="absolute top-5 left-5 z-40 w-12 h-12 bg-transparent border border-white/30 text-white rounded-full flex items-center justify-center transition-all duration-300 hover:bg-white/10 hover:border-white/50 hover:shadow-[0_0_20px_rgba(255,255,255,0.3)] backdrop-blur-sm"
          style={{ pointerEvents: 'auto', zIndex: 20000, }}
          aria-label="Return to tour path"
        >
          <svg 
            className="w-6 h-6 transform rotate-180" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M13 7l5 5m0 0l-5 5m5-5H6" 
            />
          </svg>
        </button>

        {/* Next Gallery Button */}

        {/* <button
          onClick={() => alert('Next Gallery')}
          className="absolute top-5 right-5 z-40 w-12 h-12 bg-transparent border border-white/30 text-white rounded-full flex items-center justify-center transition-all duration-300 hover:bg-white/10 hover:border-white/50 hover:shadow-[0_0_20px_rgba(255,255,255,0.3)] backdrop-blur-sm"
          style={{ pointerEvents: 'auto' }}
          aria-label="Next gallery"
        >
          <svg 
            className="w-6 h-6" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M13 7l5 5m0 0l-5 5m5-5H6" 
            />
          </svg>
        </button>*/}
          <Swiper
            modules={[Navigation, Pagination, Zoom]}
            spaceBetween={0}
            onSwiper={setSwiper}
            zoom={true}
            initialSlide={initialSlide}
            onSlideChange={(swiper) => setCurrentSlide(swiper.activeIndex)}
            className="w-full h-full"
          >
            {images.map((image, index) => (
              <SwiperSlide key={index} className="flex items-center justify-center">
                <div className="swiper-zoom-container w-full h-full flex items-center justify-center relative">
                                  {/* Image Caption */}

                {image.caption && (
                  <div className="absolute top-5 left-1/2 transform -translate-x-1/2 z-20 text-center">
                    <div className="bg-black/70 text-white px-4 py-2 rounded-full backdrop-blur-sm">
                      <h3 className="text-sm font-medium">{image.caption}</h3>
                    </div>
                  </div>
                )}
                <AspectRatio ratio={getImageAspectRatio(image)} className="w-full h-full">

                  <img
                    src={image.full}
                    alt={image.caption || `Image ${index + 1}`}
                    style={{
                      objectFit: getObjectFitStyle(image),
                      width: "100%",
                      height: "100%",
                      borderRadius: "0", // Remove curved corners
                    }}
                    onLoad={() => handleImageLoad(index)}
                    onError={() => handleImageError(index)}
                  />
                </AspectRatio>
                </div>
              </SwiperSlide>
            ))}
          </Swiper>

          {/* Custom Navigation Arrows */}
          {currentSlide > 0 && (
            <button
              onClick={goToPrev}
              className="absolute left-4 top-1/2 transform -translate-y-1/2 z-30 w-12 h-12 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer"
              style={{ pointerEvents: 'auto' }}
            >
              <ChevronLeft size={24} />
            </button>
          )}
          
          {currentSlide < images.length - 1 && (
            <button
              onClick={goToNext}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 z-30 w-12 h-12 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer"
              style={{ pointerEvents: 'auto' }}
            >
              <ChevronRight size={24} />
            </button>
          )}

          {/* Custom Pagination Dots with Counter */}
          <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-30 flex flex-col items-center space-y-2" style={{ pointerEvents: 'auto' }}>
            {/* Image Counter */}
            <div className="text-white/90 text-sm bg-black/50 px-3 py-1 rounded-full font-medium">
              {currentSlide + 1} / {images.length}
            </div>
            
            {/* Pagination Dots */}
            <div className="flex space-x-1.5 mb-2">
              {images.map((_, index) => (
                <button
                  key={index}
                  onClick={() => goToSlide(index)}
                  className={`w-2 h-2 bottom-2 rounded-full transition-all duration-200 ${
                    index === currentSlide 
                      ? 'bg-white scale-110' 
                      : 'bg-white/50 hover:bg-white/75'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Main SwiperGallery Component
const SwiperGallery: React.FC<SwiperGalleryProps> = ({ 
  images, 
  onClose, 
  mode = 'modal-fullscreen',
  triggerModal = false,
  className = ''
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  // Handle external modal trigger
  useEffect(() => {
    if (triggerModal && mode === 'modal-fullscreen') {
      setIsModalOpen(true);
    }
  }, [triggerModal, mode]);

  const openModal = useCallback((index: number) => {
    if (mode === 'modal-fullscreen') {
      setSelectedImageIndex(index);
      setIsModalOpen(true);
    }
  }, [mode]);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    onClose();
  }, [onClose]);

  // Grid-only mode
  if (mode === 'grid-only') {
    return (
      <div className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 ${className}`}>
        {images.map((image, index) => (
          <div
            key={index}
            className="group cursor-pointer transform transition-all duration-300 hover:scale-105 hover:shadow-lg"
          >
            <AspectRatio ratio={2/3} className="relative overflow-hidden bg-gray-800">
              <img
                src={image.thumb}
                alt={image.caption || `Thumbnail ${index + 1}`}
                style={{
                  objectFit: "cover",
                  width: "100%",
                  height: "100%",
                  transition: "transform 0.3s ease",
                }}
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/placeholder.svg';
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              {image.caption && (
                <div className="absolute bottom-2 left-2 right-2">
                  <p className="text-white text-sm font-medium truncate">{image.caption}</p>
                </div>
              )}
            </AspectRatio>
          </div>
        ))}
      </div>
    );
  }

  // Modal + Fullscreen mode
  return (
    <>
      {/* Show thumbnails only if not triggered externally */}
      {!triggerModal && (
        <div className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 ${className}`}>
          {images.map((image, index) => (
            <div
              key={index}
              className="group cursor-pointer transform transition-all duration-300 hover:scale-105 hover:shadow-lg"
              onClick={() => openModal(index)}
            >
              <AspectRatio ratio={2/3} className="relative overflow-hidden bg-gray-800">
                <img
                  src={image.thumb}
                  alt={image.caption || `Thumbnail ${index + 1}`}
                  style={{
                    objectFit: "cover",
                    width: "100%",
                    height: "100%",
                    transition: "transform 0.3s ease",
                  }}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/placeholder.svg';
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                {image.caption && (
                  <div className="absolute bottom-2 left-2 right-2">
                    <p className="text-white text-sm font-medium truncate">{image.caption}</p>
                  </div>
                )}
              </AspectRatio>
            </div>
          ))}
        </div>
      )}

      {/* Fullscreen Modal - Show when triggered externally or when thumbnail clicked */}
      {(isModalOpen || triggerModal) && (
        <>
          <SwiperModal
            images={images}
            onClose={closeModal}
            initialSlide={triggerModal ? 0 : selectedImageIndex}
          />
        </>
      )}
    </>
  );
};

export default SwiperGallery; 