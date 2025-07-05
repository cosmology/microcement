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