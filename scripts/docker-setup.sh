#!/bin/bash

# Docker Setup Script for Microcement Project with 3D Scene
# This script helps manage Docker containers and dependencies

set -e

echo "🐳 Microcement Docker Setup Script"
echo "=================================="

# Function to check if Docker is running
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        echo "❌ Docker is not running. Please start Docker Desktop first."
        exit 1
    fi
    echo "✅ Docker is running"
}

# Function to clean up containers and images
cleanup() {
    echo "🧹 Cleaning up Docker resources..."
    docker-compose down --remove-orphans
    docker system prune -f
    echo "✅ Cleanup complete"
}

# Function to install dependencies
install_deps() {
    echo "📦 Installing dependencies..."
    docker-compose --profile dev build --no-cache
    echo "✅ Dependencies installed"
}

# Function to start development
start_dev() {
    echo "🚀 Starting development environment..."
    docker-compose --profile dev up --build
}

# Function to start production
start_prod() {
    echo "🏭 Starting production environment..."
    docker-compose --profile prod up --build
}

# Function to rebuild everything
rebuild() {
    echo "🔨 Rebuilding everything..."
    cleanup
    install_deps
    echo "✅ Rebuild complete"
}

# Main script logic
case "${1:-help}" in
    "dev")
        check_docker
        start_dev
        ;;
    "prod")
        check_docker
        start_prod
        ;;
    "install")
        check_docker
        install_deps
        ;;
    "cleanup")
        check_docker
        cleanup
        ;;
    "rebuild")
        check_docker
        rebuild
        ;;
    "help"|*)
        echo "Usage: $0 [command]"
        echo ""
        echo "Commands:"
        echo "  dev      - Start development environment"
        echo "  prod     - Start production environment"
        echo "  install  - Install dependencies"
        echo "  cleanup  - Clean up Docker resources"
        echo "  rebuild  - Clean up and rebuild everything"
        echo "  help     - Show this help message"
        echo ""
        echo "Examples:"
        echo "  $0 dev     # Start development"
        echo "  $0 rebuild # Clean rebuild"
        ;;
esac 