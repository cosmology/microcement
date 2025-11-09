# Universal Links vs Custom URL Schemes

## Current Implementation

### Web → iOS (Opening Scanner)
- **Method**: Custom URL Scheme
- **Code**: `window.open('roomscanner://')` in `RoomScanner.tsx`
- **Does NOT use**: Universal Links
- **File NOT needed**: `apple-app-site-association`

### iOS → Web (After Upload)
- **Method**: Simple redirect
- **Code**: `UIApplication.shared.open(URL(string: "https://yourdomain.com/?exportId=xxx")!)`
- **Does NOT use**: Universal Links
- **File NOT needed**: `apple-app-site-association`

## What is `apple-app-site-association`?

This file is for **Universal Links** - a different iOS deep linking mechanism.

### Universal Links vs Custom URL Schemes

| Feature | Custom URL Scheme | Universal Links |
|---------|-------------------|-----------------|
| **Format** | `roomscanner://` | `https://yourdomain.com/scanner` |
| **Works** | Always (if app installed) | Only if app installed |
| **Fallback** | Shows error if app not installed | Opens web page if app not installed |
| **Setup** | Just add URL scheme in Xcode | Requires `apple-app-site-association` file |
| **User Experience** | Can be confusing (no app → error) | Seamless (web if no app) |

## Should You Use Universal Links?

### ✅ Use Universal Links If:
- You want users to share web URLs that open in the app
- You want fallback to web page if app not installed
- You want better user experience

### ❌ Don't Need Universal Links If:
- You only open app from your own web app (current flow)
- Custom URL schemes work fine for you
- You don't need shareable web URLs

## Current Status

**File**: `public/.well-known/apple-app-site-association`
- **Status**: Present but not used
- **Action**: Can be removed or kept for future use

## If You Want to Use Universal Links

### 1. Verify Bundle ID
```bash
# In Xcode:
# Target → General → Bundle Identifier
# Example: com.ivanprokic.roomplan
```

### 2. Get Team ID
```bash
# From Apple Developer account
# Or Xcode: Preferences → Accounts → Team ID
# Example: 79JP2DBQYU
```

### 3. Update `apple-app-site-association`
```json
{
  "applinks": {
    "details": [
      {
        "appID": "79JP2DBQYU.com.ivanprokic.roomplan",
        "components": [
          {
            "/": "/scanner/*",
            "comment": "Opens scanner in iOS app"
          },
          {
            "/": "/?exportId=*",
            "comment": "Opens app with export ID"
          }
        ]
      }
    ]
  }
}
```

### 4. Configure iOS App
- Enable "Associated Domains" capability
- Add domain: `applinks:yourdomain.com`
- Handle Universal Link in `SceneDelegate`

### 5. Update Web Code
Replace custom URL schemes with web URLs:
```typescript
// Instead of: window.open('roomscanner://')
// Use: window.location.href = 'https://yourdomain.com/scanner'
```

## Recommendation

**For Current Flow**: The file is **NOT needed** and can be removed.

**For Future**: Keep the file if you plan to implement Universal Links, but make sure:
1. `appID` matches your actual Team ID + Bundle ID
2. Paths match your web routes
3. iOS app has Associated Domains configured

