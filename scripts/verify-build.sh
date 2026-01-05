#!/bin/bash

# Vibe Justice Build Verification Script
# This script runs all checks before deployment

set -e

echo "🔍 Starting build verification for Vibe Justice..."
echo ""

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print success
success() {
    echo -e "${GREEN}✓${NC} $1"
}

# Function to print error
error() {
    echo -e "${RED}✗${NC} $1"
    exit 1
}

# Function to print info
info() {
    echo -e "${YELLOW}→${NC} $1"
}

# 1. Type checking
info "Running TypeScript type check..."
npm run type-check || error "Type check failed"
success "Type check passed"
echo ""

# 2. Linting
info "Running ESLint..."
npm run lint || error "Linting failed"
success "Linting passed"
echo ""

# 3. Format checking
info "Checking code formatting..."
npm run format:check || error "Format check failed"
success "Format check passed"
echo ""

# 4. Running tests
info "Running tests..."
npm run test:run || error "Tests failed"
success "Tests passed"
echo ""

# 5. Building application
info "Building application..."
npm run build || error "Build failed"
success "Build completed"
echo ""

# 6. Verify build output
info "Verifying build output..."
if [ ! -d "dist/browser" ]; then
    error "Build output directory not found"
fi
if [ ! -f "dist/browser/index.html" ]; then
    error "index.html not found in build output"
fi
success "Build output verified"
echo ""

echo -e "${GREEN}🎉 All checks passed! Build is ready for deployment.${NC}"
