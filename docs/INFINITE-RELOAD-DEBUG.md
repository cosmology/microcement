# Infinite Reload Debugging

## Issue
App keeps reloading/re-rendering infinitely.

## Potential Causes

### 1. ✅ FIXED: Context Value Re-creation
**Problem:** Passing new object `{ user, role, profile, loading }` on every render
**Solution:** Memoized with `useMemo()` using `user?.id` as dependency

### 2. Possible: AuthHandler triggering setUser repeatedly
Check if `AuthHandler` is calling `onUserChange` in a loop.

### 3. Possible: useEffect dependencies causing loops
Check for circular dependencies in useEffects.

## How to Debug

### Step 1: Open Browser Console
Look for these patterns:
```
🔐 [useUserRole] Starting initial profile load... (repeated many times)
🔍 HomeClient: User ID changed: ... (repeated)
```

### Step 2: Add Render Counter
Add this at the top of HomeClient to see if it's re-rendering:

```tsx
const renderCount = useRef(0);
renderCount.current += 1;
console.log('🔄 HomeClient render #', renderCount.current);
```

### Step 3: Check Console for Pattern
- If you see "HomeClient render #1, #2, #3..." rapidly, it's infinite re-render
- If you see "useUserRole Starting initial profile load" repeating, there's a hook dependency issue

## Quick Fixes Applied

1. ✅ Memoized `userRoleContextValue` to prevent object re-creation
2. ✅ Used `userWithRole?.id` as dependency (stable) instead of entire object

## If Still Reloading

Try this temporary fix to isolate the issue:

```tsx
// In HomeClient.tsx, comment out UserRoleProvider temporarily:
return (
  // <UserRoleProvider value={userRoleContextValue}>
    <div className="relative">
      {/* ... rest of code ... */}
    </div>
  // </UserRoleProvider>
)
```

If it stops reloading without UserRoleProvider, the issue is in the Context.
If it still reloads, the issue is in useUserRole() or AuthHandler.

## Next Steps

Please check browser console and tell me:
1. What logs are repeating?
2. How fast is it reloading (continuously or every few seconds)?
3. Any error messages?

