# Docker Setup for Microcement Project

This project includes Docker configuration for both development and production environments.

## Prerequisites

- Docker
- Docker Compose

## Quick Start

### Development Mode

For development with hot reloading:

```bash
# Using the optimized development setup
docker-compose --profile dev up

# Or using the simple development setup
docker-compose --profile dev-simple up
```

### Production Mode

For production deployment:

```bash
docker-compose --profile prod up --build
```

## Available Services

### Development Services

1. **app-dev** (Profile: `dev`)
   - Uses multi-stage Dockerfile with dependency caching
   - Hot reloading enabled
   - Volume mounts for live code changes
   - Optimized for development workflow

2. **app-dev-simple** (Profile: `dev-simple`)
   - Simple Node.js Alpine image
   - Installs dependencies on each run
   - Good for quick testing or when you don't need caching

### Production Service

- **app-prod** (Profile: `prod`)
  - Optimized production build
  - Standalone Next.js output
  - Minimal image size
  - Production-ready configuration

## Usage Examples

### Start Development Environment
```bash
# Start with hot reloading
docker-compose --profile dev up

# Start in detached mode
docker-compose --profile dev up -d

# View logs
docker-compose logs -f app-dev
```

### Start Production Environment
```bash
# Build and start production
docker-compose --profile prod up --build

# Start in detached mode
docker-compose --profile prod up --build -d
```

### Stop Services
```bash
# Stop all services
docker-compose down

# Stop and remove volumes
docker-compose down -v
```

### Rebuild Services
```bash
# Rebuild development
docker-compose --profile dev build

# Rebuild production
docker-compose --profile prod build --no-cache
```

## Environment Variables

The following environment variables are automatically set:

- `NODE_ENV`: Set to `development` or `production`
- `NEXT_TELEMETRY_DISABLED`: Set to `1` to disable Next.js telemetry
- `PORT`: Set to `3000`
- `HOSTNAME`: Set to `0.0.0.0` for Docker compatibility

## Ports

- **3000**: Next.js application (mapped to host port 3000)

## Volumes

### Development Mode
- Source code is mounted for live reloading
- `node_modules` and `.next` are excluded from mounting for performance

### Production Mode
- No volumes mounted (self-contained)

## Troubleshooting

### Build Issues
```bash
# Clean build
docker-compose --profile prod build --no-cache

# Check build logs
docker-compose --profile prod build --progress=plain
```

### Permission Issues
```bash
# Fix file permissions
sudo chown -R $USER:$USER .
```

### Port Conflicts
If port 3000 is already in use, modify the port mapping in `docker-compose.yml`:
```yaml
ports:
  - "3001:3000"  # Change 3001 to any available port
```

### Memory Issues
For large builds, you might need to increase Docker memory limits in Docker Desktop settings.

## File Structure

```
.
├── Dockerfile              # Multi-stage Docker build
├── docker-compose.yml      # Docker Compose configuration
├── .dockerignore          # Files to exclude from build
├── next.config.mjs        # Next.js config with standalone output
└── README-Docker.md       # This file
```

## Notes

- The Dockerfile uses multi-stage builds for optimal image size
- Next.js standalone output is enabled for production builds
- Development mode includes volume mounts for live code changes
- All services use Node.js 18 Alpine for smaller image sizes
- PNPM is used as the package manager (as detected from your lock file)

## Features

### Core Components
- **HeroSection**: Animated text reveal with scroll interactions
- **BeforeAndAfterSection**: Interactive slider for project comparisons
- **EnvironmentalSection**: Eco-friendly benefits showcase
- **ComparisonSection**: Micro-cement vs traditional materials
- **BenefitsSection**: Target audience benefits
- **GallerySection**: Project portfolio with filtering
- **SpeedSection**: Installation speed advantages
- **LuxurySection**: High-end design applications
- **CTASection**: Call-to-action for consultations

### Technical Features
- **Theme System**: Light/Dark mode with smooth transitions
- **Scroll Animations**: Framer Motion powered interactions
- **Responsive Design**: Mobile-first approach
- **Performance Optimized**: Next.js 14 with App Router
- **TypeScript**: Full type safety
- **Tailwind CSS**: Utility-first styling

## 🐳 Docker Configuration

For detailed Docker setup instructions, configuration options, and troubleshooting, see:

**[📖 README-Docker.md](./README-Docker.md)**

The Docker setup includes:
- Multi-stage builds for optimization
- Development and production profiles
- Volume mounting for hot reloading
- Environment variable management

## 🛠️ Technology Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Animations**: Framer Motion
- **Theme**: Custom theme provider
- **Deployment**: Docker containerization
- **Package Manager**: pnpm

## 🎯 Prototype Purpose

This repository serves as a **prototype for a microcement website proposal**, demonstrating:

1. **Modern Web Design**: Contemporary UI/UX patterns
2. **Interactive Elements**: Engaging user interactions
3. **Professional Presentation**: Industry-appropriate styling
4. **Technical Excellence**: Performance and accessibility
5. **Scalability**: Easy to extend and customize

## 📝 Development Notes

- All animations are scroll-driven for optimal performance
- Theme switching is persistent across sessions
- Components are modular and reusable
- Docker configuration supports both development and production
- Responsive design tested across multiple devices

## 📄 Contributing

This is a prototype repository. For production use:
1. Replace placeholder content with actual company information
2. Add real project images and case studies
3. Integrate with a CMS for content management
4. Add analytics and tracking
5. Implement contact forms and lead generation

## 📄 License

This prototype is created for demonstration purposes. Please ensure proper licensing for production use.

---

**Note**: This is a prototype showcasing web development capabilities for microcement services. For production deployment, additional security, performance, and content management considerations should be addressed. 