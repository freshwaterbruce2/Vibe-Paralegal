<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />

# Vibe Justice

**AI-Powered Paralegal Assistant for Employment & Family Law**

[![CI](https://github.com/freshwaterbruce2/Vibe-Paralegal/actions/workflows/ci.yml/badge.svg)](https://github.com/freshwaterbruce2/Vibe-Paralegal/actions/workflows/ci.yml)
[![Deploy](https://github.com/freshwaterbruce2/Vibe-Paralegal/actions/workflows/deploy.yml/badge.svg)](https://github.com/freshwaterbruce2/Vibe-Paralegal/actions/workflows/deploy.yml)
[![codecov](https://codecov.io/gh/freshwaterbruce2/Vibe-Paralegal/branch/main/graph/badge.svg)](https://codecov.io/gh/freshwaterbruce2/Vibe-Paralegal)

</div>

## 📋 Overview

Vibe Justice is a comprehensive AI-powered paralegal assistant designed to help manage legal cases in:
- **Employment Law** (South Carolina regulations, Walmart policies, Sedgwick claims)
- **Family Law** (Child custody, support, alimony, asset division)

### Key Features

- 🤖 **AI Analysis** - Automated violation detection and legal analysis powered by DeepSeek
- 📄 **OCR Document Processing** - Extract text from images and documents
- 📊 **Case Management** - Track deadlines, evidence, contacts, and timelines
- 💰 **Damage Calculator** - Calculate lost wages, medical expenses, and total damages
- 📱 **Mobile Upload** - Cross-device document upload with QR code
- 📈 **Action Plans** - AI-generated daily task checklists
- 🔒 **Privacy First** - All data stored locally in your browser

---

## 🚀 Quick Start

### Prerequisites

- **Node.js 20+** ([Download](https://nodejs.org/))
- **npm** (included with Node.js)

### Automated Setup

Run the automated setup script:

```bash
# Clone the repository
git clone https://github.com/freshwaterbruce2/Vibe-Paralegal.git
cd Vibe-Paralegal

# Run automated setup
./scripts/setup.sh
```

This script will:
1. ✅ Verify Node.js installation
2. ✅ Install all dependencies
3. ✅ Configure Git hooks
4. ✅ Create environment template
5. ✅ Run initial code quality checks

### Manual Setup

```bash
# Install dependencies
npm install --legacy-peer-deps

# Setup Git hooks
npm run prepare

# Create environment file
cp .env.local.example .env.local
```

### Configuration

Edit `.env.local` and add your DeepSeek API key:

```env
DEEPSEEK_API_KEY=your_api_key_here
```

> **Note:** The application previously used Google Gemini but has migrated to DeepSeek API.

### Run Development Server

```bash
npm run dev
```

Visit **http://localhost:4200** in your browser.

---

## 🛠️ Development

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm test` | Run tests in watch mode |
| `npm run test:ui` | Run tests with UI |
| `npm run test:run` | Run tests once |
| `npm run test:coverage` | Generate coverage report |
| `npm run lint` | Lint code with ESLint |
| `npm run lint:fix` | Fix linting issues |
| `npm run format` | Format code with Prettier |
| `npm run format:check` | Check code formatting |
| `npm run type-check` | Run TypeScript compiler |

### Build Verification

Before committing or deploying, verify your build:

```bash
./scripts/verify-build.sh
```

This automated script checks:
- ✅ TypeScript type safety
- ✅ ESLint rules
- ✅ Code formatting
- ✅ All tests passing
- ✅ Production build succeeds
- ✅ Build output verification

---

## 🔄 Automation Features

### CI/CD Pipeline

**GitHub Actions workflows** run automatically on every push and pull request:

#### CI Workflow (`.github/workflows/ci.yml`)
- **Lint** - ESLint code quality checks
- **Format Check** - Prettier formatting validation
- **Type Check** - TypeScript compilation
- **Tests** - Full test suite with coverage
- **Build** - Production build verification

#### Deploy Workflow (`.github/workflows/deploy.yml`)
- **Automated Deployment** to Vercel on every push to `main`
- **Environment URLs** automatically generated

#### Release Workflow (`.github/workflows/release.yml`)
- **Automated Releases** when version tags are pushed
- **Changelog Generation** from git commits
- **Build Artifacts** attached to releases

### Pre-commit Hooks

**Husky + lint-staged** automatically runs before every commit:

1. **ESLint** - Fixes linting issues
2. **Prettier** - Formats code
3. **Type Check** - Ensures TypeScript validity

This ensures all committed code meets quality standards.

### Automated Dependency Updates

**Dependabot** automatically:
- 📦 Checks for npm package updates weekly (Mondays at 9 AM)
- 🔧 Groups related dependencies (Angular, testing, linting)
- 🤖 Creates pull requests with updates
- ✅ Runs CI checks on all dependency PRs

### Code Coverage

**Codecov integration** provides:
- 📊 Automated coverage reports on every CI run
- 📈 Coverage trends over time
- 💬 PR comments with coverage changes

---

## 📁 Project Structure

```
vibe-justice/
├── .github/
│   ├── workflows/          # CI/CD workflows
│   │   ├── ci.yml          # Continuous Integration
│   │   ├── deploy.yml      # Automated deployment
│   │   └── release.yml     # Release automation
│   └── dependabot.yml      # Dependency updates
├── .husky/                 # Git hooks
│   └── pre-commit          # Pre-commit quality checks
├── scripts/
│   ├── setup.sh            # Automated dev environment setup
│   └── verify-build.sh     # Build verification
├── src/
│   ├── components/         # 13 Angular standalone components
│   ├── services/           # 9 services (AI, OCR, state, etc.)
│   ├── models.ts           # TypeScript interfaces
│   └── app.component.ts    # Root component
├── vitest.config.ts        # Testing configuration
├── eslint.config.js        # Linting rules
├── .prettierrc             # Code formatting rules
├── vercel.json             # Deployment configuration
└── package.json            # Dependencies & scripts
```

### Key Components

- **Chat** - AI paralegal conversation interface
- **Violation Analysis** - Automated legal violation detection
- **File Analyzer** - OCR and AI document analysis
- **Case Details** - Employment case information
- **Family Law** - Family case management
- **Timeline Editor** - Master case chronology
- **Evidence Log** - Evidence tracking
- **Contact Log** - Communication history
- **Deadline Calendar** - Critical date tracking
- **Damage Calculator** - Financial calculations
- **Mobile Upload** - Cross-device file upload

---

## 🚢 Deployment

### Vercel (Automated)

**Automatic deployment** on push to `main`:

1. Push to `main` branch
2. GitHub Actions builds the project
3. Vercel deployment workflow triggers
4. Live URL generated automatically

### Manual Deployment

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy to preview
vercel

# Deploy to production
vercel --prod
```

### Required Secrets

Configure in GitHub repository settings:

- `VERCEL_TOKEN` - Vercel authentication token
- `VERCEL_ORG_ID` - Your Vercel organization ID
- `VERCEL_PROJECT_ID` - Project ID from Vercel
- `CODECOV_TOKEN` - (Optional) Codecov upload token

---

## 🧪 Testing

### Running Tests

```bash
# Watch mode (interactive)
npm test

# Run once
npm run test:run

# With UI
npm run test:ui

# With coverage
npm run test:coverage
```

### Test Structure

Tests are located in `src/**/__tests__/` directories:

```
src/
├── services/
│   └── __tests__/
│       └── case-data.service.spec.ts
└── components/
    └── __tests__/
        └── chat.component.spec.ts
```

---

## 🎨 Code Quality

### Linting

```bash
# Check for issues
npm run lint

# Auto-fix issues
npm run lint:fix
```

### Formatting

```bash
# Format all files
npm run format

# Check formatting
npm run format:check
```

### Type Checking

```bash
npm run type-check
```

---

## 🤝 Contributing

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (pre-commit hooks will run automatically)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

All PRs automatically run:
- ✅ Linting
- ✅ Type checking
- ✅ Tests
- ✅ Build verification

---

## 📝 Release Process

### Creating a Release

```bash
# Tag a new version
git tag -a v1.0.0 -m "Release version 1.0.0"

# Push the tag
git push origin v1.0.0
```

The **Release workflow** automatically:
1. Builds the application
2. Generates changelog from commits
3. Creates GitHub release
4. Attaches build artifacts

---

## 🏗️ Tech Stack

- **Frontend**: Angular 20 (Standalone Components)
- **Language**: TypeScript 5.8
- **Styling**: TailwindCSS
- **AI**: DeepSeek API
- **OCR**: Tesseract.js
- **Testing**: Vitest + Testing Library
- **Linting**: ESLint + Prettier
- **CI/CD**: GitHub Actions
- **Deployment**: Vercel
- **State**: Angular Signals
- **Storage**: Browser LocalStorage

---

## 📄 License

This project is private and proprietary.

---

## 🔗 Links

- **Live App**: [Coming Soon]
- **Issues**: [GitHub Issues](https://github.com/freshwaterbruce2/Vibe-Paralegal/issues)
- **Discussions**: [GitHub Discussions](https://github.com/freshwaterbruce2/Vibe-Paralegal/discussions)

---

## 💡 Support

Need help? Check out:

1. **Documentation** - This README and inline code comments
2. **GitHub Issues** - Report bugs or request features
3. **AI Studio** - Original app viewer (legacy)

---

**Built with ❤️ for legal professionals**
