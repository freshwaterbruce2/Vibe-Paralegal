# Contributing to Vibe Justice

Thank you for your interest in contributing to Vibe Justice! This document provides guidelines and instructions for contributing.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)
- [Automated Checks](#automated-checks)

## Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment for all contributors.

## Getting Started

### Prerequisites

- Node.js 20+ ([Download](https://nodejs.org/))
- Git
- A GitHub account

### Setup

1. **Fork the repository** on GitHub

2. **Clone your fork**:
   ```bash
   git clone https://github.com/YOUR_USERNAME/Vibe-Paralegal.git
   cd Vibe-Paralegal
   ```

3. **Add upstream remote**:
   ```bash
   git remote add upstream https://github.com/freshwaterbruce2/Vibe-Paralegal.git
   ```

4. **Run automated setup**:
   ```bash
   ./scripts/setup.sh
   ```

5. **Configure environment**:
   ```bash
   # Edit .env.local and add your API key
   DEEPSEEK_API_KEY=your_key_here
   ```

## Development Workflow

### 1. Create a Feature Branch

```bash
# Update your local main branch
git checkout main
git pull upstream main

# Create and checkout a new branch
git checkout -b feature/your-feature-name
```

### Branch Naming Conventions

- `feature/` - New features (e.g., `feature/add-export-pdf`)
- `fix/` - Bug fixes (e.g., `fix/deadline-notification`)
- `docs/` - Documentation changes (e.g., `docs/update-readme`)
- `refactor/` - Code refactoring (e.g., `refactor/ai-service`)
- `test/` - Test additions/changes (e.g., `test/add-coverage`)
- `chore/` - Maintenance tasks (e.g., `chore/update-deps`)

### 2. Make Your Changes

```bash
# Start development server
npm run dev

# Run tests in watch mode
npm test

# Check code quality
npm run lint
npm run type-check
```

### 3. Run Pre-commit Checks

Our **pre-commit hooks** automatically run when you commit, but you can run them manually:

```bash
# Run all checks
./scripts/verify-build.sh

# Individual checks
npm run lint:fix          # Auto-fix linting issues
npm run format            # Format all code
npm run test:run          # Run all tests
npm run type-check        # TypeScript validation
npm run build             # Build for production
```

### 4. Commit Your Changes

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```bash
git add .
git commit -m "feat: add PDF export functionality"
```

**Pre-commit hooks** will automatically:
- ✅ Run ESLint and auto-fix issues
- ✅ Format code with Prettier
- ✅ Validate TypeScript types

### 5. Push and Create Pull Request

```bash
git push origin feature/your-feature-name
```

Then create a Pull Request on GitHub.

## Coding Standards

### TypeScript

- Use **TypeScript** for all code
- Enable **strict mode** (already configured)
- Avoid `any` types when possible
- Use **interfaces** for data structures
- Use **Angular signals** for reactive state

### Angular

- Use **standalone components** (no NgModules)
- Use **OnPush change detection**
- Follow **Angular style guide**
- Use **dependency injection** for services

### Code Style

Our automated tools enforce code style:

- **ESLint** - Code quality and patterns
- **Prettier** - Code formatting
- **TypeScript** - Type safety

```bash
# Auto-fix all style issues
npm run lint:fix
npm run format
```

### File Structure

```typescript
// Component file structure
import { Component } from '@angular/core';

@Component({
  selector: 'app-example',
  standalone: true,
  templateUrl: './example.component.html',
  styleUrl: './example.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExampleComponent {
  // Signals first
  readonly data = signal<string>('');

  // Constructor and injection
  constructor(private service: ExampleService) {}

  // Lifecycle hooks
  ngOnInit() {}

  // Public methods
  public handleClick() {}

  // Private methods
  private helperMethod() {}
}
```

## Commit Guidelines

### Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation changes
- `style` - Code style changes (formatting, etc.)
- `refactor` - Code refactoring
- `perf` - Performance improvements
- `test` - Test additions/changes
- `build` - Build system changes
- `ci` - CI/CD changes
- `chore` - Maintenance tasks
- `revert` - Revert previous commit

### Examples

```bash
# Feature
git commit -m "feat(ai): add policy analysis capability"

# Bug fix
git commit -m "fix(deadline): correct notification timing"

# Documentation
git commit -m "docs(readme): update installation instructions"

# Breaking change
git commit -m "feat(api)!: migrate from Gemini to DeepSeek

BREAKING CHANGE: API key must now be for DeepSeek instead of Gemini"
```

## Pull Request Process

### 1. Before Submitting

- [ ] All tests pass (`npm run test:run`)
- [ ] Build succeeds (`npm run build`)
- [ ] Linting passes (`npm run lint`)
- [ ] Code is formatted (`npm run format:check`)
- [ ] Documentation updated (if needed)
- [ ] CHANGELOG updated (for significant changes)

### 2. PR Title Format

Use [Conventional Commits](https://www.conventionalcommits.org/) format:

```
feat: add PDF export functionality
fix: correct deadline notification bug
docs: update contributing guidelines
```

### 3. PR Description

Use the **PR template** (automatically added) and include:

- **Description** of changes
- **Type of change** (feature, bug fix, etc.)
- **Related issue** (if applicable)
- **Testing** details
- **Screenshots** (if UI changes)

### 4. Review Process

1. **Automated checks** run on every PR:
   - Linting
   - Type checking
   - Tests
   - Build verification
   - Code coverage

2. **Manual review** by maintainers

3. **Address feedback** and push changes

4. **Approval and merge** by maintainers

## Automated Checks

All PRs trigger **automated CI/CD checks**:

### CI Pipeline

- ✅ **Lint** - ESLint code quality
- ✅ **Format Check** - Prettier validation
- ✅ **Type Check** - TypeScript compilation
- ✅ **Tests** - Full test suite with coverage
- ✅ **Build** - Production build verification

### PR-Specific Checks

- ✅ **Auto-labeling** - Based on changed files
- ✅ **Size labeling** - PR size classification
- ✅ **Title validation** - Conventional Commits format
- ✅ **AI review** - Automated checklist comment

### Required Status Checks

All checks must pass before merging:

```
✅ Lint
✅ Test
✅ Type Check
✅ Build
```

## Testing

### Writing Tests

Place tests in `__tests__` directories:

```
src/
├── services/
│   ├── ai.service.ts
│   └── __tests__/
│       └── ai.service.spec.ts
└── components/
    ├── chat/
    │   ├── chat.component.ts
    │   └── __tests__/
    │       └── chat.component.spec.ts
```

### Test Structure

```typescript
import { describe, it, expect, beforeEach } from 'vitest';

describe('ExampleService', () => {
  let service: ExampleService;

  beforeEach(() => {
    service = new ExampleService();
  });

  it('should create', () => {
    expect(service).toBeTruthy();
  });

  it('should process data correctly', () => {
    const result = service.processData('input');
    expect(result).toBe('expected output');
  });
});
```

### Running Tests

```bash
# Watch mode
npm test

# Run once
npm run test:run

# With UI
npm run test:ui

# Coverage report
npm run test:coverage
```

## Questions?

- Open an [issue](https://github.com/freshwaterbruce2/Vibe-Paralegal/issues)
- Start a [discussion](https://github.com/freshwaterbruce2/Vibe-Paralegal/discussions)

---

**Thank you for contributing to Vibe Justice!** 🎉
