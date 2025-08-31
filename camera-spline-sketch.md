# Camera Spline Sketch with Hotspot Placements

## Camera Path Points (GSAP Spline)
```
Point 1: (20, 5, 0)    - Start position
Point 2: (-8, 6.5, 2)  - Moving left and up
Point 3: (-14, 6.75, 7) - Further left, deeper into space
Point 4: (-10, 7, 27)  - Moving forward (Z+)
Point 5: (-4, 7, 30)   - Slight right, still forward
Point 6: (-2, 7.25, 32) - More right, highest point
Point 7: (18, 7.5, 32) - Far right, maintaining height
Point 8: (20, 8, 20)   - Back to right side, moving back
```

## Hotspot Placements (Numbered)

### Floor Level (Y ≈ 0-1)
```
1. Floor (Hotspot_geo_floor)
   Position: Center of space, ground level
   Gallery Images: 10
```

### Kitchen Area (Left Side, Z ≈ 0-10)
```
2. Backsplash (Hotspot_geo_backsplash)
   Position: Left wall, kitchen area
   Gallery Images: 5

3. Island (Hotspot_geo_island)
   Position: Center-left, kitchen island
   Gallery Images: 10

4. Cabinet (Hotspot_geo_kitchen_cabinet)
   Position: Left wall, kitchen cabinets
   Gallery Images: 5

5. Kitchen Countertop (Hotspot_geo_kitchen_countertop)
   Position: Left wall, kitchen countertops
   Gallery Images: 5
```

### Bathroom Area (Forward, Z ≈ 20-30)
```
6. Bath Countertop (Hotspot_geo_bath_countertop)
   Position: Forward area, bathroom countertops
   Gallery Images: 5
```

### Living Area (Center-Right)
```
7. Furniture (Hotspot_geo_coffee_table)
   Position: Center-right, living area furniture
   Gallery Images: 5

8. Fireplace (Hotspot_geo_fireplace)
   Position: Right wall, fireplace area
   Gallery Images: 12
```

### Additional Areas
```
9. Wall Furniture (Hotspot_geo_shelves)
   Position: Various walls, shelving units
   Gallery Images: 5

10. Accent Wall (Hotspot_geo_accent_wall)
    Position: Feature wall, accent design
    Gallery Images: 8
```

## Camera Journey Flow

```
START (20, 5, 0)
    ↓
    Move left and up to kitchen area
    ↓
    (-8, 6.5, 2) → (-14, 6.75, 7)
    ↓
    Move forward to bathroom area
    ↓
    (-10, 7, 27) → (-4, 7, 30) → (-2, 7.25, 32)
    ↓
    Move right to living area
    ↓
    (18, 7.5, 32) → (20, 8, 20)
    ↓
    END - Return to right side
```

## Spatial Layout (Top View)

```
    Front (Z+)
    ↑
    |
    |     [6] Bath Countertop
    |         (Z ≈ 25-30)
    |
    |  [2] Backsplash    [8] Fireplace
    |  [3] Island         (Right Wall)
    |  [4] Cabinet
    |  [5] Kitchen        [7] Furniture
    |  Countertop         (Center-Right)
    |
    |     [1] Floor
    |     (Center)
    |
    |  [9] Wall Furniture
    |  [10] Accent Wall
    |
    ↓
    Back (Z-)
```

## Camera Height Progression

```
Y = 5 → 6.5 → 6.75 → 7 → 7 → 7.25 → 7.5 → 8
(Start)                                    (End)
```

## Hotspot Interaction Zones

- **Kitchen Zone**: Hotspots 2-5 (Backsplash, Island, Cabinet, Kitchen Countertop)
- **Bathroom Zone**: Hotspot 6 (Bath Countertop)
- **Living Zone**: Hotspots 7-8 (Furniture, Fireplace)
- **Feature Zone**: Hotspots 9-10 (Wall Furniture, Accent Wall)
- **Foundation**: Hotspot 1 (Floor)

## Camera Path Characteristics

- **Total Distance**: ~60 units in 3D space
- **Height Range**: 5-8 units (3 unit vertical movement)
- **Horizontal Range**: -14 to +20 units (34 unit span)
- **Depth Range**: 0 to 32 units (32 unit forward movement)
- **Smooth Transitions**: Catmull-Rom spline interpolation
- **Look-at Targets**: Dynamic focusing on each hotspot area 