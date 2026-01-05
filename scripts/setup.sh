#!/bin/bash

# Vibe Justice Development Environment Setup Script

set -e

echo "🚀 Setting up Vibe Justice development environment..."
echo ""

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

success() {
    echo -e "${GREEN}✓${NC} $1"
}

info() {
    echo -e "${YELLOW}→${NC} $1"
}

# 1. Check Node.js version
info "Checking Node.js version..."
NODE_VERSION=$(node -v)
echo "   Node.js version: $NODE_VERSION"
success "Node.js is installed"
echo ""

# 2. Install dependencies
info "Installing dependencies..."
npm install --legacy-peer-deps
success "Dependencies installed"
echo ""

# 3. Setup Git hooks
info "Setting up Git hooks..."
npm run prepare
success "Git hooks configured"
echo ""

# 4. Create .env template if it doesn't exist
if [ ! -f ".env.local" ]; then
    info "Creating .env.local template..."
    cat > .env.local << 'EOF'
# Vibe Justice Environment Variables
# Copy this file to .env.local and fill in your values

# DeepSeek API Configuration
DEEPSEEK_API_KEY=your_deepseek_api_key_here

# Optional: Analytics and monitoring
# ANALYTICS_ID=
# SENTRY_DSN=
EOF
    success ".env.local template created"
else
    info ".env.local already exists, skipping..."
fi
echo ""

# 5. Run initial checks
info "Running initial code quality checks..."
npm run lint || true
echo ""

info "Running initial tests..."
npm run test:run || true
echo ""

echo -e "${GREEN}✨ Setup complete! You're ready to start developing.${NC}"
echo ""
echo "Next steps:"
echo "  1. Edit .env.local and add your DeepSeek API key"
echo "  2. Run 'npm run dev' to start the development server"
echo "  3. Visit http://localhost:4200 in your browser"
