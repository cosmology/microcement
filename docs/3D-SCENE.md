# 3D Scene Implementation

This document describes the 3D scroll-based camera experience implemented in the Microcement project, similar to the Virtual Well-being Hub.

## Overview

The 3D scene provides an immersive experience where users can navigate through different sections of the website by scrolling, with a camera that moves along a predefined path in 3D space.

## Architecture

### Core Components

1. **ScrollScene** (`components/ScrollScene.tsx`)
   - Main 3D scene container
   - Handles camera positioning and movement
   - Manages scroll-based animations

2. **Scene** (Internal component)
   - Contains all 3D objects and lighting
   - Handles camera path interpolation
   - Manages section transitions

3. **FloatingText** (Internal component)
   - Displays section titles in 3D space
   - Handles hover interactions
   - Provides HTML overlays for content

### Technology Stack

- **Three.js**: Core 3D graphics library
- **React Three Fiber**: React wrapper for Three.js
- **@react-three/drei**: Useful helpers and controls
- **GSAP ScrollTrigger**: Scroll-based animation control
- **Framer Motion**: Additional animation capabilities

## Features

### Camera Movement

The camera follows a smooth path defined by keyframe positions:

```typescript
const cameraPath = [
  { position: [0, 0, 8], rotation: [0, 0, 0], target: [0, 0, 0] },
  { position: [3, 2, 6], rotation: [0, 0.3, 0], target: [2, 0, 0] },
  { position: [-2, 3, 7], rotation: [0, -0.4, 0], target: [-1, 1, 0] },
  // ... more positions
]
```

### Section Content

Each section is represented by floating 3D text elements:

```typescript
const sections = [
  { title: "Transform Spaces", subtitle: "Sustainably", position: [0, 0, 0] },
  { title: "Environmental", subtitle: "Benefits", position: [2, 0, 0] },
  // ... more sections
]
```

### Visual Effects

- **Floating Particles**: 100 animated spheres with emissive materials
- **Dynamic Lighting**: Ambient, directional, and point lights
- **Environment**: Sunset preset for atmospheric lighting
- **Central Hub**: Glowing sphere at the origin

## Integration

### HomeClient Integration

The 3D scene is integrated into the main page layout:

```typescript
// app/components/HomeClient.tsx
import ScrollScene from "../../components/ScrollScene";

export default function HomeClient() {
  return (
    <div className="relative">
      <NavigationSection />
      <ScrollScene /> {/* 3D scene background */}
      <main className="relative z-10"> {/* Content overlay */}
        <HeroSection />
        {/* ... other sections */}
      </main>
    </div>
  )
}
```

### Z-Index Layering

- **ScrollScene**: `z-0` (background)
- **Main Content**: `z-10` (foreground)
- **Navigation**: `z-20` (top layer)

## Dependencies

### Package.json Additions

```json
{
  "dependencies": {
    "three": "^0.162.0",
    "@react-three/fiber": "^8.17.10",
    "@react-three/drei": "^9.102.6",
    "gsap": "^3.12.5"
  },
  "devDependencies": {
    "@types/three": "^0.162.0"
  }
}
```

### Docker Integration

The Docker setup automatically handles the new dependencies:

1. **Development**: Dependencies are installed in the container
2. **Production**: Multi-stage build optimizes the final image
3. **Hot Reloading**: Volume mounts ensure changes are reflected immediately

## Performance Considerations

### Optimization Techniques

1. **Object Pooling**: Reuse 3D objects where possible
2. **Level of Detail**: Adjust detail based on camera distance
3. **Frustum Culling**: Only render visible objects
4. **Texture Compression**: Optimize texture sizes

### Browser Compatibility

- **WebGL Support**: Requires WebGL 2.0 or higher
- **Fallback**: Graceful degradation for unsupported browsers
- **Mobile**: Optimized for touch interactions

## Customization

### Camera Path

Modify the `cameraPath` array to change camera movement:

```typescript
const cameraPath = [
  { position: [x, y, z], rotation: [rx, ry, rz], target: [tx, ty, tz] },
  // Add more keyframes as needed
]
```

### Section Content

Update the `sections` array to change displayed content:

```typescript
const sections = [
  { title: "Your Title", subtitle: "Your Subtitle", position: [x, y, z] },
  // Add more sections
]
```

### Visual Styling

Customize colors, lighting, and effects:

```typescript
// Particle colors
color={i % 2 === 0 ? "#4f46e5" : "#06b6d4"}

// Lighting intensity
<ambientLight intensity={0.4} />
<directionalLight position={[10, 10, 5]} intensity={1} />
```

## Troubleshooting

### Common Issues

1. **Black Screen**: Check WebGL support and console errors
2. **Performance Issues**: Reduce particle count or disable effects
3. **Scroll Not Working**: Ensure ScrollTrigger is properly initialized
4. **Camera Jumps**: Check camera path interpolation

### Debug Mode

Enable debug mode for development:

```typescript
// Add to ScrollScene component
<Canvas
  camera={{ position: [0, 0, 8], fov: 75 }}
  gl={{ antialias: true, alpha: true }}
  onCreated={({ gl }) => {
    gl.setClearColor('#000000', 0)
  }}
>
```

## Future Enhancements

### Planned Features

1. **Interactive Elements**: Clickable 3D objects
2. **Sound Effects**: Audio feedback for interactions
3. **VR Support**: Virtual reality compatibility
4. **Custom Shaders**: Advanced visual effects
5. **Physics**: Realistic object interactions

### Performance Improvements

1. **WebGL 2.0**: Utilize advanced rendering features
2. **Instancing**: Batch similar objects
3. **Compression**: Optimize asset loading
4. **Caching**: Implement object caching

## References

- [Three.js Documentation](https://threejs.org/docs/)
- [React Three Fiber](https://docs.pmnd.rs/react-three-fiber/)
- [GSAP ScrollTrigger](https://greensock.com/docs/v3/Plugins/ScrollTrigger)
- [Virtual Well-being Hub](https://virtualwellbeinghub.ca/en/well-being-hub)

## Support

For issues related to the 3D scene:

1. Check browser console for errors
2. Verify WebGL support
3. Test with different browsers
4. Review performance metrics
5. Consult Three.js community resources 