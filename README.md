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
``` bash
microcement/
├── app/
│ ├── components/ # React components
│ │ ├── HeroSection.tsx
│ │ ├── BeforeAndAfterSection.tsx
│ │ ├── EnvironmentalSection.tsx
│ │ └── ...
│ ├── globals.css # Global styles
│ ├── layout.tsx # Root layout
│ └── page.tsx # Main page
├── components/ # Shared components
│ ├── theme-provider.tsx # Theme management
│ └── theme-toggle.tsx # Theme switcher
├── public/ # Static assets
├── Dockerfile # Docker configuration
├── docker-compose.yml # Docker Compose setup
└── README-Docker.md # Detailed Docker instructions

```