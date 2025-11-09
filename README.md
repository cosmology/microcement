# Microcement Website Prototype

A modern, responsive website prototype showcasing microcement solutions and services. This project demonstrates the potential for a professional microcement company website with advanced animations, theme switching, and interactive components.

## 🏗️ Project Overview

This prototype features:
- **Interactive Hero Section** with scroll-driven animations
- **Before & After Slider** for project showcases
- **Theme Switching** (Light/Dark modes)
- **Responsive Design** optimized for all devices
- **Smooth Animations** using Framer Motion
- **Docker Support** for easy deployment

## 🚀 Quick Start

### One-Liner (Complete Setup)
```bash
cd supabase && docker compose up -d && docker compose exec liquibase liquibase update && cd .. && docker compose --profile dev up
```

### Prerequisites
- Docker and Docker Compose installed
- Node.js 18+ (for local development)

### Running with Docker (Recommended)

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd microcement
   ```

2. **Start the application**
   ```bash
   # Development mode with hot reloading
   docker-compose --profile dev up
   
   # Production mode
   docker-compose --profile prod up --build
   ```

3. **Access the application**
   - Development: http://localhost:3000
   - Production: http://localhost:3000

### Local Development

1. **Install dependencies**
   ```bash
   npm install
   # or
   pnpm install
   ```

2. **Run development server**
   ```bash
   npm run dev
   # or
   pnpm dev
   ```

3. **Build for production**
   ```bash
   npm run build
   npm start
   ```

## 🔧 Development Tools

### TypeScript Verification

Run the verification script to check TypeScript types, linting, and build:

```bash
./scripts/verify.sh
```

This script will:
- Check if the Docker container is running (start it if needed)
- Run TypeScript type checking
- Run ESLint for code quality
- Test the build process
- Exit with error code if any checks fail

### Dependency Management

#### Clean and Regenerate Lock File

If you encounter dependency issues or want to ensure a clean dependency tree:

```bash
# Clean and regenerate lockfile in one command
docker exec -it microcement-app-dev-1 sh -c "
  pnpm store prune &&
  rm -f pnpm-lock.yaml &&
  pnpm store prune --force &&
  pnpm install
"
```

This command will:
- Clean the pnpm store
- Remove the existing lock file
- Force clean the store again
- Reinstall all dependencies with a fresh lock file

## 📁 Project Structure 
```bash
microcement/
├── app/
│   ├── [locale]/              # Internationalized routes (en, es, sr)
│   │   ├── layout.tsx          # Locale-specific layout
│   │   └── page.tsx            # Main page wrapper
│   ├── api/                    # Next.js API routes
│   │   ├── upload/             # Project brief upload
│   │   ├── user-assets/        # User asset management
│   │   ├── architects/         # Architect data
│   │   ├── architect-clients/  # Client relationship updates
│   │   ├── camera-path/        # Camera path CRUD
│   │   └── gallery/            # Gallery image fetching
│   ├── components/             # React components
│   │   ├── SceneEditor.tsx     # Main 3D scene renderer
│   │   ├── CameraPathEditor3D.tsx  # 2D waypoint editor
│   │   ├── DockedNavigation.tsx    # Left-docked nav panel
│   │   ├── HomeClient.tsx      # Client-side orchestrator
│   │   ├── HeroSection.tsx     # Landing hero
│   │   ├── GallerySection.tsx  # Hotspot gallery modal
│   │   ├── ProjectBriefModal.tsx   # Upload modal
│   │   ├── ArchitectModelsList.tsx # Architect's client projects
│   │   ├── ModelsList.tsx      # End user's projects
│   │   ├── LoaderOverlay.tsx   # Progress overlay
│   │   └── ...                 # 40+ components
│   ├── layout.tsx              # Root layout
│   └── globals.css             # Global styles
│
├── components/                 # Shared UI components
│   ├── ui/                     # shadcn/ui components
│   │   ├── button.tsx
│   │   ├── dialog.tsx
│   │   ├── slider.tsx
│   │   └── ...                 # 50+ UI components
│   ├── theme-provider.tsx      # Theme context
│   └── theme-toggle.tsx        # Theme switcher
│
├── lib/
│   ├── config/
│   │   ├── sceneConfig.ts      # 3D scene constants
│   │   └── defaultOrbitalPath.ts  # Orbital camera config
│   ├── services/
│   │   ├── SceneConfigService.ts  # Scene data service
│   │   ├── ModelLoader.ts         # GLTF model loader
│   │   └── UserProfileService.ts  # User profile caching
│   ├── stores/                 # Zustand state management
│   │   ├── cameraStore.ts      # Camera & Three.js refs
│   │   ├── cameraEditorStore.ts   # Editor state
│   │   ├── themeStore.ts       # Theme state
│   │   └── dockedNavigationStore.ts  # Nav panel state
│   ├── supabase.ts             # Supabase client
│   └── utils.ts                # Utility functions
│
├── hooks/
│   ├── useUserRole.ts          # User role & auth hook
│   ├── use-toast.ts            # Toast notifications
│   └── use-mobile.tsx          # Mobile detection
│
├── messages/                   # i18n translations
│   ├── en.json                 # English
│   ├── es.json                 # Spanish
│   └── sr.json                 # Serbian
│
├── public/
│   ├── models/                 # 3D models (.glb)
│   ├── images/                 # Static images
│   └── uploads/                # User-uploaded files
│
├── supabase/
│   ├── docker-compose.yml      # Supabase services
│   ├── liquibase/              # Database migrations
│   │   ├── changelog-master.xml
│   │   └── changelogs/         # Migration changesets
│   │       ├── 0001-create-tables.yaml
│   │       ├── 0002-create-rls.yaml
│   │       ├── 0003-add-user-data.yaml
│   │       ├── 0004-ensure-auth-uid-and-rls.yaml
│   │       ├── 0005-storage.yaml
│   │       ├── 0006-user-assets.yaml
│   │       └── 0007-fix-storage-permissions.yaml
│   └── migrations/             # Ad-hoc SQL migrations
│
├── scripts/                    # Utility scripts
│   ├── dump-prod-to-local.sh   # Database dump (uses env vars)
│   ├── add-admin-rls.sh        # Apply admin RLS policies
│   └── ...                     # 30+ utility scripts
│
├── docs/                       # Documentation
│   ├── CAMERA-PATH-SYSTEM-EXPLAINED.md
│   ├── ARCHITECT-CLIENT-RELATIONSHIP.md
│   ├── THREE-PANEL-WORKFLOW.md
│   └── ...                     # 20+ documentation files
│
├── Dockerfile                  # Next.js Docker config
├── docker-compose.yml          # App services
├── env.example                 # Environment template
├── next.config.mjs             # Next.js configuration
├── tailwind.config.ts          # Tailwind CSS config
└── tsconfig.json               # TypeScript config
```