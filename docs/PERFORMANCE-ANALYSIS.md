# Performance Analysis: Multiple Mounts and Re-renders

## 🚨 Critical Issues Found

### Issue 1: Multiple SceneEditor Mounts (3x on page load)

**Root Cause:**
- `HomeClient.tsx` renders `SceneEditor` in **TWO different render functions**:
  - `renderEndUserContent()` (line 759)
  - `renderArchitectContent()` (line 809)
- React Strict Mode in development causes **double mounting** for effect testing
- Auth state changes cause role transitions: `undefined` → `guest` → `architect`

**Evidence from logs:**
```
SceneEditor.tsx:282 🔄 Loading scene settings from Supabase... (appears 3 times)
SceneEditor.tsx:641 🎧 [EVENT LISTENER] Registered: scene-reload-camera (3 times)
SceneEditor.tsx:645 🔌 [EVENT LISTENER] Removed: scene-reload-camera (2 times)
```

**Mount sequence:**
1. Initial render: `role = undefined` → loading state
2. Role loads: `role = 'architect'` → `renderArchitectContent()` → SceneEditor mounts
3. React Strict Mode: Unmount and remount (development only)
4. Possible role change or user data update → another mount

### Issue 2: useUserRole Hook Called 6+ Times

**Root Cause:**
Each of these components calls `useUserRole()` independently, creating 6 separate Supabase auth subscriptions:

1. ✅ **HomeClient.tsx** (line 50) - NEEDED (main app state)
2. ❌ **SceneEditor.tsx** (line 33) - REDUNDANT (receives `user` as prop)
3. ❌ **ProjectBriefModal.tsx** (line 49) - COULD USE CONTEXT
4. ❌ **DockedNavigation.tsx** (line 31) - COULD USE CONTEXT
5. ❌ **NavigationSection.tsx** (line 30) - COULD USE CONTEXT
6. ❓ **ScrollScene.tsx** (line 33) - POSSIBLY OBSOLETE FILE

**Evidence from logs:**
```
useUserRole.ts:32 🔐 [useUserRole] Starting initial profile load... (6+ times)
useUserRole.ts:88 🔐 [useUserRole] Loading user profile for auth change... (multiple times)
```

**Each hook instance:**
- Creates a Supabase auth subscription
- Fetches user profile from database
- Maintains separate state
- Re-renders on auth changes

### Issue 3: Duplicate Files (SceneEditor vs ScrollScene)

**Discovery:**
- `SceneEditor.tsx`: 6312 lines
- `ScrollScene.tsx`: 6144 lines
- Both export default functions with nearly identical names
- Both use `useUserRole()`

**Question:** Are these files duplicates, or do they serve different purposes?

---

## 🎯 Solution Plan

### Fix 1: Create UserRole Context (High Priority)

**Why:** Eliminate 5 redundant Supabase subscriptions

**Implementation:**
1. Create `UserRoleContext` in `HomeClient.tsx`
2. `useUserRole()` only in `HomeClient` (top level)
3. Pass role/user via Context to child components
4. Remove `useUserRole()` from all child components

**Files to modify:**
- ✅ `HomeClient.tsx` - Create and provide context
- `SceneEditor.tsx` - Remove hook, use context
- `ProjectBriefModal.tsx` - Remove hook, use context
- `DockedNavigation.tsx` - Remove hook, use context
- `NavigationSection.tsx` - Remove hook, use context

### Fix 2: Add SceneEditor Mount Guard (Medium Priority)

**Why:** Prevent unnecessary re-mounts during role transitions

**Implementation:**
1. Add a `useRef` to track if SceneEditor should mount
2. Only mount SceneEditor when `role` is stable (not transitioning)
3. Add a small debounce (100ms) to prevent rapid mount/unmount cycles
4. Memoize SceneEditor with `useMemo` based on stable props

**Files to modify:**
- `HomeClient.tsx` - Add mount guard logic

### Fix 3: Investigate ScrollScene vs SceneEditor (High Priority)

**Why:** Might be duplicate/obsolete code causing confusion

**Actions:**
1. Compare file contents to determine if one is obsolete
2. If duplicate, remove obsolete file
3. Update all imports to use single source of truth

### Fix 4: Optimize Re-renders (Medium Priority)

**Implementation:**
1. Wrap expensive components in `React.memo()`
2. Use `useCallback` for callback props
3. Split `HomeClient` into smaller sub-components
4. Use Zustand for shared state instead of prop drilling

---

## 📊 Expected Performance Improvements

### Before:
- 6 Supabase auth subscriptions
- 6 database queries for user profile (with cache, but still 6 hook instances)
- SceneEditor mounts 3 times
- Excessive logging: ~200 console logs on page load

### After:
- 1 Supabase auth subscription (83% reduction)
- 1 database query for user profile
- SceneEditor mounts 1 time (67% reduction)
- Essential logging only

### Impact:
- **Faster page load** (fewer DB queries)
- **Reduced memory usage** (fewer subscriptions/listeners)
- **Smoother transitions** (no unnecessary unmounts)
- **Cleaner console** (actionable logs only)

---

## 🔍 Next Steps

1. ✅ Investigate ScrollScene vs SceneEditor relationship
2. Create UserRole Context Provider
3. Refactor all components to use Context instead of hook
4. Add mount guard to HomeClient
5. Test in development and production modes
6. Profile before/after with React DevTools Profiler

