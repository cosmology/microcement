# Distance Measurement Tool - Implementation Plan

## ⚠️ UPDATED SCOPE

**This plan has been superseded by `WALL-DIMENSION-VISUALIZATION-OPTIONS.md`**

The new requirement is to **automatically display wall dimensions (width × height)** on each wall when measurements are shown, **without any user interaction**. This helps visualize wall sizes for surface area calculations and material estimation.

**See `WALL-DIMENSION-VISUALIZATION-OPTIONS.md` for the correct implementation plan.**

---

## 🎯 Original Overview (Deprecated - Click-to-Measure)

~~Implement a click-to-measure distance tool that displays measurements between two points in 3D space, with a look-and-feel similar to old SketchUp drawing lines.~~

## 📐 Look-and-Feel Alternatives

### Option 1: Old SketchUp Style (Recommended for your request) ⭐
**Characteristics:**
- Clean white/dark lines (depending on background)
- Simple dimension text (e.g., "3.50m")
- Extension lines (dashed perpendicular lines from measurement points)
- Dimension line offset from the actual measurement line
- Small circular markers at measurement points
- Minimal, technical drawing aesthetic

**Pros:**
- Classic, recognizable style
- Clean and unobtrusive
- Professional architectural look
- Good readability

**Cons:**
- May need to adjust line color based on background (light/dark mode)

**Visual Example:**
```
       3.50m
    ──────────
   │         │
   ●         ●
   (point1)  (point2)
```

---

### Option 2: Modern Architectural Style
**Characteristics:**
- Colored lines (blue/purple accent)
- Dimension text with arrows at line ends
- Stylized text with background
- Gradient or shadow effects
- More modern, polished look

**Pros:**
- More visible and eye-catching
- Better contrast against backgrounds
- Modern aesthetic

**Cons:**
- Less "technical" looking
- More complex to render

---

### Option 3: Minimal Technical Drawing Style
**Characteristics:**
- Simple black/white lines
- Small text labels without backgrounds
- Arrow markers at line ends
- Dimension line parallel to measurement
- Technical drawing aesthetic

**Pros:**
- Very clean and minimal
- Professional technical look
- Lightweight rendering

**Cons:**
- May be less visible against complex backgrounds

---

### Option 4: CAD-Style Dimension Lines
**Characteristics:**
- Extension lines with arrows
- Text centered on dimension line
- Leader lines for text placement
- Very precise, engineering-style

**Pros:**
- Professional CAD look
- Clear dimension indication
- Industry standard style

**Cons:**
- More complex geometry
- Requires careful alignment

---

## 🏗️ Implementation Plan

### Phase 1: Core Distance Measurement System

#### 1.1 Create DistanceMeasurementTool Component/Module
**File:** `lib/utils/distanceMeasurementTool.ts` (or `app/components/DistanceMeasurementTool.tsx`)

**Features:**
- Click-to-place first point
- Click-to-place second point
- Calculate 3D distance between points
- Store multiple measurements in array
- Clear/reset measurements
- Delete individual measurements

**Data Structure:**
```typescript
interface DistanceMeasurement {
  id: string;
  point1: THREE.Vector3;
  point2: THREE.Vector3;
  distance: number; // in meters
  label?: string; // optional custom label
}

interface DistanceMeasurementState {
  measurements: DistanceMeasurement[];
  isActive: boolean;
  currentPoint1: THREE.Vector3 | null;
  currentPoint2: THREE.Vector3 | null;
  isPlacing: boolean; // true when placing first point, false when placing second
}
```

#### 1.2 Integrate with Measurements Toggle
- Only enable distance measurement when `showMeasurements === true`
- When measurements are hidden, hide all distance measurements too
- Toggle distance measurement tool on/off separately (optional)

#### 1.3 Add to Zustand Store (or local state)
**Option A:** Add to `sceneStore.ts`
```typescript
distanceMeasurements: DistanceMeasurement[];
addDistanceMeasurement: (measurement: DistanceMeasurement) => void;
removeDistanceMeasurement: (id: string) => void;
clearDistanceMeasurements: () => void;
isDistanceToolActive: boolean;
setDistanceToolActive: (active: boolean) => void;
```

**Option B:** Local state in SceneEditor (simpler for MVP)

---

### Phase 2: Visual Rendering (SketchUp Style)

#### 2.1 Measurement Line
**Components:**
- **Main measurement line:** `THREE.Line` with `THREE.LineBasicMaterial`
  - Color: White for dark backgrounds, dark for light backgrounds (theme-aware)
  - Linewidth: 2-3px
  - Style: Solid line
  
- **Extension lines (perpendicular):** Dashed lines from measurement points
  - `THREE.LineDashedMaterial` with dash pattern `[5, 5]` or `[10, 5]`
  - Lighter color (0.5 opacity)
  - Length: ~0.2-0.3m (configurable)
  
- **Point markers:** Small spheres or circles at measurement points
  - `THREE.Mesh` with `THREE.SphereGeometry` (radius: ~0.05m)
  - `THREE.MeshBasicMaterial` with solid color
  - Visible at measurement endpoints

#### 2.2 Text Labels
**Implementation Options:**

**Option A: CSS2DRenderer (Recommended) ⭐**
- HTML-based text that stays aligned to 3D position
- Pros: Best readability, easy styling, supports HTML/CSS
- Cons: Requires CSS2DRenderer setup, slightly more complex
- **Library:** `three/examples/jsm/renderers/CSS2DRenderer.js`

**Option B: Canvas Texture + Sprite**
- Render text to canvas, create texture, apply to sprite
- Pros: Pure Three.js, no extra renderer
- Cons: Less readable at distance, harder to style

**Option C: THREE.TextGeometry**
- 3D extruded text
- Pros: True 3D text
- Cons: Heavy rendering, less readable, requires font loading

**Recommendation:** CSS2DRenderer for best SketchUp-style readability

**Text Style (SketchUp-like):**
- Font: Arial or similar sans-serif, 12-14px
- Color: White with black outline OR black with white outline (for contrast)
- Position: Centered on measurement line, slightly offset above
- Background: Optional subtle semi-transparent background
- Format: `"3.50m"` or `"3.50 m"` (2 decimal places)

#### 2.3 Wall-to-Wall Detection
**Smart Snapping (Optional Enhancement):**
- When clicking near a wall, snap to wall center or edge
- Use raycasting to detect nearby walls from `roomPlanMetadata`
- Snap tolerance: ~0.2m radius
- Visual feedback when snapping (highlight snap point)

**Implementation:**
1. Cast ray from camera through mouse click position
2. Check intersection with measurement walls (if available)
3. If intersection found within tolerance, use intersection point
4. Otherwise, use direct click position on floor plane (Y = floor height)

---

### Phase 3: User Interaction

#### 3.1 Click Handling
**Flow:**
1. Enable measurement tool (when `showMeasurements === true`)
2. User clicks to place first point
   - Visual feedback: Show temporary marker at click position
   - Store point in `currentPoint1`
3. User clicks to place second point
   - Calculate distance
   - Create measurement line and label
   - Add to measurements array
   - Reset to ready for next measurement

#### 3.2 Visual Feedback During Placement
- **First point placed:** Show marker at point1
- **Hovering for second point:** Show temporary line from point1 to mouse
- **Second point placed:** Create permanent measurement

#### 3.3 Measurement Management
- **Delete measurement:** Right-click or button on measurement label
- **Clear all:** Button in UI to clear all measurements
- **Persistence:** Optional - save measurements to store/state

---

### Phase 4: Integration with SceneEditor

#### 4.1 Add to SceneEditor Component
**Location:** Inside the measurements useEffect or separate useEffect

**Dependencies:**
- Only active when `showMeasurements === true`
- Requires `sceneRef`, `cameraRef`, `rendererRef`
- Requires mouse/click event handlers

#### 4.2 Event Handling
**Mouse Click Handler:**
- Intercept clicks when measurement tool is active
- Convert screen coordinates to 3D world coordinates
- Place measurement points
- Prevent conflicts with other scene interactions (hotspots, etc.)

**Raycasting:**
- Use `THREE.Raycaster` to convert mouse clicks to 3D positions
- Optionally: Intersect with floor plane or wall surfaces for snapping

#### 4.3 Rendering
- Add measurement lines to scene
- Setup CSS2DRenderer for text labels (if using Option A)
- Update measurements when scene rotates (labels stay aligned)

---

### Phase 5: UI Controls

#### 5.1 Toggle Button (Optional)
**Location:** In DockedNavigation or SceneEditor controls

**Options:**
- Add "Enable Distance Measurement" button
- OR: Auto-enable when measurements are shown
- OR: Keyboard shortcut (e.g., 'M' for measure)

**Recommendation:** Auto-enable when measurements are shown (simpler UX)

#### 5.2 Measurement Controls
- **Clear All Measurements** button
- **Delete Measurement** (right-click or button on label)
- **Toggle Measurement Labels** (show/hide text)
- **Measurement Settings** (unit conversion, precision, etc.)

---

## 📁 File Structure

```
lib/utils/
  └── distanceMeasurementTool.ts     # Core measurement logic

app/components/
  ├── DistanceMeasurementRenderer.tsx # Rendering component
  └── DistanceMeasurementUI.tsx      # UI controls (optional)

lib/stores/
  └── sceneStore.ts                  # Add measurement state (optional)
```

---

## 🎨 SketchUp-Style Visual Specifications

### Line Style
- **Color:** `0xffffff` (white) for dark backgrounds, `0x000000` (black) for light
- **Linewidth:** 2-3
- **Opacity:** 1.0 (fully opaque)

### Extension Lines (Perpendicular Dashed Lines)
- **Color:** Same as main line, but 50% opacity
- **Pattern:** `[10, 5]` (10px dash, 5px gap)
- **Length:** 0.2-0.3m (perpendicular to measurement line)
- **Position:** At each endpoint, extending away from measurement

### Point Markers
- **Shape:** Small sphere
- **Radius:** 0.03-0.05m
- **Color:** Same as line color
- **Material:** `THREE.MeshBasicMaterial` with solid fill

### Text Label
- **Font:** Arial, sans-serif
- **Size:** 12-14px (CSS pixels)
- **Color:** White text with black stroke/outline (or vice versa)
- **Format:** `"X.XXm"` (2 decimal places, 'm' for meters)
- **Position:** Centered on measurement line, offset 0.1-0.2m above line
- **Background:** Optional subtle semi-transparent background for readability

---

## 🔧 Technical Implementation Details

### 1. Click-to-3D Position Conversion

```typescript
function getWorldPositionFromClick(
  mouseEvent: MouseEvent,
  camera: THREE.PerspectiveCamera,
  scene: THREE.Scene
): THREE.Vector3 {
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  
  // Convert screen coordinates to normalized device coordinates
  mouse.x = (mouseEvent.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(mouseEvent.clientY / window.innerHeight) * 2 + 1;
  
  // Raycast to floor plane (Y = 0 or floor height)
  raycaster.setFromCamera(mouse, camera);
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const intersection = new THREE.Vector3();
  raycaster.ray.intersectPlane(plane, intersection);
  
  return intersection;
}
```

### 2. Distance Calculation

```typescript
function calculateDistance(point1: THREE.Vector3, point2: THREE.Vector3): number {
  return point1.distanceTo(point2);
}
```

### 3. Extension Line Calculation

```typescript
function createExtensionLine(
  point: THREE.Vector3,
  measurementLine: THREE.Line,
  extensionLength: number = 0.2
): THREE.Line {
  // Calculate perpendicular direction
  const lineDir = new THREE.Vector3()
    .subVectors(measurementLine.endPoint, measurementLine.startPoint)
    .normalize();
  
  // Perpendicular vector (rotate 90 degrees)
  const perpDir = new THREE.Vector3(-lineDir.z, 0, lineDir.x).normalize();
  
  // Extension line points
  const extStart = point.clone();
  const extEnd = point.clone().add(perpDir.multiplyScalar(extensionLength));
  
  // Create dashed line
  const geometry = new THREE.BufferGeometry().setFromPoints([extStart, extEnd]);
  const material = new THREE.LineDashedMaterial({
    color: 0xffffff,
    dashSize: 0.1,
    gapSize: 0.05,
    opacity: 0.5,
    transparent: true,
  });
  const line = new THREE.Line(geometry, material);
  line.computeLineDistances(); // Required for LineDashedMaterial
  
  return line;
}
```

### 4. CSS2DRenderer Setup (if using Option A)

```typescript
import { CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer.js';

// In SceneEditor initialization
const labelRenderer = new CSS2DRenderer();
labelRenderer.setSize(window.innerWidth, window.innerHeight);
labelRenderer.domElement.style.position = 'absolute';
labelRenderer.domElement.style.top = '0';
labelRenderer.domElement.style.pointerEvents = 'none';
container.appendChild(labelRenderer.domElement);

// In render loop
labelRenderer.render(scene, camera);
```

---

## 🚀 Implementation Steps (Execution Order)

1. **Create core measurement tool module** (`distanceMeasurementTool.ts`)
   - State management
   - Click handling logic
   - Distance calculation

2. **Add visual rendering** (SketchUp-style)
   - Measurement lines
   - Extension lines (dashed)
   - Point markers
   - Text labels (CSS2DRenderer)

3. **Integrate with SceneEditor**
   - Add to measurements useEffect
   - Mouse click handlers
   - Raycasting for 3D position

4. **Add wall-to-wall snapping** (optional enhancement)
   - Wall detection from roomPlanMetadata
   - Snap-to-wall logic
   - Visual feedback

5. **UI controls** (optional)
   - Clear measurements button
   - Delete individual measurement
   - Toggle measurement visibility

---

## 📝 Alternative Text Rendering Comparison

| Method | Readability | Performance | Styling | Complexity |
|--------|-------------|-------------|---------|------------|
| **CSS2DRenderer** ⭐ | Excellent | Good | Easy (HTML/CSS) | Medium |
| Canvas + Sprite | Good | Excellent | Medium | Medium |
| TextGeometry | Poor | Poor | Hard | High |

**Recommendation:** Use CSS2DRenderer for best SketchUp-style look and readability.

---

## 🎯 Success Criteria

- ✅ Click to place two points and see distance measurement
- ✅ Measurement displays with SketchUp-style line and text label
- ✅ Multiple measurements can be placed
- ✅ Measurements visible only when `showMeasurements === true`
- ✅ Wall-to-wall distance measurement works
- ✅ Text labels remain readable from all angles
- ✅ Measurements persist until cleared
- ✅ Performance is good (no lag when placing measurements)

---

## ⚠️ Considerations

1. **Performance:** Limit number of measurements (e.g., max 20) to prevent lag
2. **Click Conflicts:** Ensure measurement clicks don't interfere with hotspot clicks
3. **Theme Awareness:** Line/text colors should adapt to light/dark mode
4. **Precision:** Display distances with appropriate precision (2 decimal places)
5. **Unit Conversion:** Future enhancement - support feet/inches

---

## 🚦 Ready to Proceed?

**Recommended Implementation:**
- **Style:** Option 1 (Old SketchUp Style) ⭐
- **Text Rendering:** CSS2DRenderer ⭐
- **Snapping:** Basic floor plane intersection (wall snapping as enhancement)
- **UI:** Auto-enable with measurements toggle (no separate button needed for MVP)

**Would you like me to proceed with this plan, or would you prefer a different style/approach?**

