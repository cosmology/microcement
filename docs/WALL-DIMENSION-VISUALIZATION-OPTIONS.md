# Wall Dimension Visualization - Look & Feel Options

## 🎯 Purpose

Automatically display wall dimensions (width × height) on each wall when measurements are shown. This helps architects, contractors, and end users visualize wall sizes for:
- **Surface area calculations** (for invoicing)
- **Material estimation** (paint, wallpaper, flooring)
- **Quick dimension verification**

**Important:** No user interaction needed - dimensions are automatically displayed from RoomPlan metadata.

---

## 📐 Look & Feel Style Options

### Option 1: Old SketchUp Style (Classic Technical Drawing) ⭐

**Visual Characteristics:**
- Clean white/dark lines (theme-aware)
- Simple text labels: `"3.50m × 2.50m"` (width × height)
- Dimension lines with extension lines
- Small markers at wall corners
- Minimal, technical drawing aesthetic

**Layout:**
```
    ┌─────────────────────┐
    │                     │
    │    3.50m × 2.50m    │  ← Label centered on wall
    │                     │
    └─────────────────────┘
    │                     │  ← Extension lines (dashed)
    ●                     ●  ← Corner markers
```

**Features:**
- Text label centered on each wall face
- Extension lines (dashed) from wall edges to label
- White text with black outline (or vice versa for readability)
- Clean, professional architectural look

**Pros:**
- Classic, recognizable style
- Clean and unobtrusive
- Professional architectural look
- Good readability

**Cons:**
- May need to adjust colors based on background
- Extension lines can clutter for small walls

---

### Option 2: Modern Architectural Labels (Floating Badges)

**Visual Characteristics:**
- Floating badge-style labels above walls
- Colored background (semi-transparent)
- Bold, modern typography
- Icon indicators for width/height
- Clean, contemporary look

**Layout:**
```
    ┌─────────────────────┐
    ╔═══════════════════╗
    ║ 3.50m × 2.50m     ║  ← Floating badge above wall
    ╚═══════════════════╝
    └─────────────────────┘
```

**Features:**
- Badge positioned above wall center
- Semi-transparent background (purple/blue accent)
- White/bold text
- Rounded corners
- Shadow for depth

**Pros:**
- Very visible and readable
- Modern, polished look
- Good contrast against backgrounds
- Doesn't clutter wall surface

**Cons:**
- More visually prominent (may be distracting)
- Less "technical" looking

---

### Option 3: Minimal Inline Labels (Subtle Text)

**Visual Characteristics:**
- Small text labels directly on wall surfaces
- No background or border
- Subtle text with stroke for readability
- Text aligned parallel to wall
- Minimal aesthetic

**Layout:**
```
    ┌─────────────────────┐
    │  3.50m × 2.50m      │  ← Text directly on wall
    └─────────────────────┘
```

**Features:**
- Text rendered directly on wall face
- No extension lines or markers
- Small font size
- Text color matches wall visualization color
- Clean, minimalist

**Pros:**
- Very clean and unobtrusive
- Minimal visual clutter
- Fast rendering
- Doesn't interfere with wall visualization

**Cons:**
- May be hard to read at angles
- Less visible from distance
- No visual separation from wall

---

### Option 4: CAD-Style Dimension Lines (Technical Drawing)

**Visual Characteristics:**
- Professional CAD-style dimensioning
- Extension lines with arrows
- Text centered on dimension line
- Leader lines for text placement
- Very precise, engineering-style

**Layout:**
```
    ┌─────────────────────┐
    │←── 3.50m ──→│       │  ← Width dimension line
    │       │             │  ← Extension lines
    ●       ●             ●
    │   WIDTH             │
    │                     │
    │   2.50m             │  ← Height dimension
    │   HEIGHT            │
    └─────────────────────┘
```

**Features:**
- Width dimension line at bottom or top of wall
- Height dimension line on side
- Arrows at dimension line ends
- Extension lines connecting to wall edges
- Professional technical drawing look

**Pros:**
- Very professional CAD look
- Clear dimension indication
- Industry standard style
- Precise and clear

**Cons:**
- More complex geometry
- Requires careful alignment
- Can be cluttered for small rooms
- More rendering overhead

---

### Option 5: Annotation Bubbles (Callout Style)

**Visual Characteristics:**
- Annotation bubbles/callouts from wall center
- Connected to wall with leader line
- Rounded bubble with text
- Pointer/arrow to wall
- Clear, annotation-style

**Layout:**
```
         ┌─────────┐
         │ 3.50m   │  ← Bubble connected to wall
         │ × 2.50m │
         └────┬────┘
              │      ← Leader line
    ┌─────────┴─────┐
    │               │
    └───────────────┘
```

**Features:**
- Bubble positioned near wall (not overlapping)
- Leader line connects bubble to wall center
- Rounded background
- Clear pointer/arrow
- Very readable

**Pros:**
- Excellent readability
- Clear visual separation
- Professional annotation look
- Doesn't obscure wall visualization

**Cons:**
- Takes up more screen space
- Can be cluttered with many walls
- More complex positioning logic

---

### Option 6: Corner Tags (Compact Labels)

**Visual Characteristics:**
- Small tags at wall corners
- Compact format: `W×H` (e.g., `3.5×2.5m`)
- Minimal visual footprint
- Corner-aligned positioning
- Very clean, compact look

**Layout:**
```
    ┌─────────────────────┐
 3.5×│                     │
 2.5m│                     │  ← Tag at corner
    └─────────────────────┘
```

**Features:**
- Small corner tag
- Compact format (e.g., `3.5×2.5m`)
- Positioned at wall corner
- Minimal styling
- Doesn't clutter center of wall

**Pros:**
- Very compact
- Minimal visual interference
- Clean look
- Fast rendering

**Cons:**
- Less prominent
- May be missed on smaller screens
- Compact format may be harder to read

---

## 🎨 Visual Element Details

### Text Formatting Options

**Format 1: Full Labels**
```
"3.50m × 2.50m"
"Width: 3.50m × Height: 2.50m"
```

**Format 2: Compact Labels**
```
"3.5 × 2.5m"
"W:3.5m H:2.5m"
"3.5×2.5m"
```

**Format 3: Separated Dimensions**
```
Width:  3.50m
Height: 2.50m
```

**Format 4: Icon-Based**
```
📐 3.50m × 2.50m
━━━━━━━━━━━━━━━
```

### Color Schemes

**Option A: Theme-Aware (Recommended)**
- Dark mode: White text with black outline
- Light mode: Black text with white outline
- Adapts to current theme automatically

**Option B: Accent Color**
- Purple accent (matches app theme)
- Semi-transparent background
- High contrast text

**Option C: Measurement Type Colors**
- Wall dimensions: Purple
- Floor dimensions: Blue
- Door/window: Green/Yellow

**Option D: Classic Technical**
- Always white/dark (background-dependent)
- High contrast
- Professional look

### Typography Options

**Option 1: Monospace (Technical)**
- `Courier New`, `Consolas`
- Even character spacing
- Technical/engineering look

**Option 2: Sans-Serif (Modern)**
- `Arial`, `Helvetica`, `Inter`
- Clean, modern
- Better readability

**Option 3: Rounded (Friendly)**
- `Comfortaa`, `Quicksand`
- Softer, friendlier
- Less technical

**Font Size Options:**
- Small: 10-12px
- Medium: 14-16px
- Large: 18-20px

---

## 📊 Comparison Matrix

| Style | Readability | Visual Clutter | Complexity | Professional Look | Performance |
|-------|-------------|----------------|------------|-------------------|-------------|
| **SketchUp Style** ⭐ | High | Medium | Medium | Very High | Good |
| **Floating Badges** | Very High | Low | Low | Medium | Excellent |
| **Minimal Inline** | Medium | Very Low | Very Low | Medium | Excellent |
| **CAD-Style** | Very High | High | High | Very High | Medium |
| **Annotation Bubbles** | Very High | Medium | Medium | High | Good |
| **Corner Tags** | Medium | Very Low | Low | Medium | Excellent |

---

## 🎯 Recommended Implementation

### Primary Recommendation: **Option 1 (SketchUp Style)** ⭐

**Why:**
- Professional architectural look
- Clear dimension display
- Familiar to architects/contractors
- Good balance of readability and visual clarity

**Implementation:**
- Text label centered on each wall
- Format: `"3.50m × 2.50m"` (width × height)
- White text with black outline (theme-aware)
- Optional extension lines (dashed, subtle)
- Small corner markers

### Alternative Recommendation: **Option 2 (Floating Badges)**

**Why:**
- Excellent readability
- Modern, polished look
- Good visibility from all angles
- Less visual clutter on walls

**Implementation:**
- Floating badge above wall center
- Semi-transparent background (purple accent)
- Bold white text
- Rounded corners, subtle shadow

---

## 🔧 Technical Implementation Notes

### Text Rendering Options

**Option A: CSS2DRenderer (Recommended for Labels)** ⭐
- HTML-based text
- Best readability
- Easy styling with CSS
- Always faces camera (billboard)
- Good performance

**Option B: Canvas Texture + Sprite**
- Rendered to texture
- Pure Three.js
- Good performance
- Less flexible styling

**Option C: THREE.TextGeometry**
- True 3D text
- Heavy rendering
- Less readable
- Not recommended

**Recommendation:** CSS2DRenderer for best readability and SketchUp-style look.

### Positioning Strategy

1. **For each wall:**
   - Calculate wall center position
   - Calculate wall normal (perpendicular to wall face)
   - Position label in front of wall face (offset by small amount, e.g., 0.05m)
   - Center label on wall face

2. **For extension lines (if Option 1):**
   - Draw dashed lines from wall edges to label
   - Perpendicular to wall face
   - Subtle, low opacity

3. **For corner markers (if Option 1):**
   - Small spheres at wall corners
   - Same color as measurement lines
   - Small radius (0.03m)

---

## 📐 Wall Dimension Extraction

From `RoomPlanMetadata.walls[]`:
- `wall.dimensions[0]` = width (meters)
- `wall.dimensions[1]` = height (meters)
- `wall.dimensions[2]` = depth (meters, usually 0.1m or 0)

**Display:**
- Width × Height (e.g., `"3.50m × 2.50m"`)
- Surface area calculation: Width × Height (for invoicing)

---

## ✅ Implementation Checklist

- [ ] Extract wall dimensions from `roomPlanMetadata.walls`
- [ ] Calculate wall center positions
- [ ] Create text labels with CSS2DRenderer (or alternative)
- [ ] Position labels on/near wall faces
- [ ] Apply chosen visual style (SketchUp/CAD/Badge/etc.)
- [ ] Theme-aware colors (light/dark mode)
- [ ] Test with multiple walls
- [ ] Performance optimization (limit label count if needed)
- [ ] Integration with existing measurement toggle

---

## 🎨 Visual Examples (ASCII Art)

### SketchUp Style (Option 1):
```
        ───────────────
       │               │
    ───┼─ 3.50m × 2.50m ───┼──  ← Extension lines (dashed)
   │   │               │   │
   ●   └───────────────┘   ●     ← Corner markers
```

### Floating Badge (Option 2):
```
        ╔═══════════════╗
        ║ 3.50m × 2.50m ║  ← Badge above wall
        ╚═══════════════╝
    ┌───────────────────────┐
    └───────────────────────┘
```

### Minimal Inline (Option 3):
```
    ┌───────────────────────┐
    │   3.50m × 2.50m       │  ← Direct on wall
    └───────────────────────┘
```

---

## 🚦 Next Steps

1. **Review all 6 style options** above
2. **Choose your preferred style** (or request a hybrid)
3. **Specify any customization preferences**:
   - Text format (full vs compact)
   - Color scheme
   - Font size
   - Position preferences
4. **Confirm implementation approach**

Once you choose, I'll implement the automatic wall dimension visualization that shows width × height for each wall when measurements are displayed.

