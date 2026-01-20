# Contributing to MR Guide

## Development Workflow

### 1. Setup Your Environment

```bash
# Clone the repository
git clone <repo-url>
cd mr-guide

# Install dependencies
npm run install:all

# Configure environment
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
```

### 2. Branch Naming Convention

| Type | Format | Example |
|------|--------|---------|
| Feature | `feature/JIRA-XXX-description` | `feature/JIRA-101-user-login` |
| Bug Fix | `bugfix/JIRA-XXX-description` | `bugfix/JIRA-102-fix-auth` |
| Hotfix | `hotfix/JIRA-XXX-description` | `hotfix/JIRA-103-security-patch` |

### 3. Commit Message Format

```
JIRA-XXX: Short description of change

- Detailed bullet point if needed
- Another detail

#comment Optional comment for JIRA
#time 2h (optional time tracking)
```

**Examples:**
```bash
git commit -m "JIRA-101: Add user authentication endpoint"
git commit -m "JIRA-102: Fix login validation #time 2h"
git commit -m "JIRA-103 #comment Completed API integration #time 3h"
```

### 4. Pull Request Process

1. **Create branch from develop:**
   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b feature/JIRA-XXX-description
   ```

2. **Make changes and commit:**
   ```bash
   git add .
   git commit -m "JIRA-XXX: Description"
   ```

3. **Push and create PR:**
   ```bash
   git push origin feature/JIRA-XXX-description
   ```

4. **PR Requirements:**
   - Title format: `JIRA-XXX: Description`
   - Link to JIRA ticket in description
   - At least 1 reviewer approval
   - All CI checks passing
   - No merge conflicts

### 5. Code Review Guidelines

**Reviewers should check:**
- Code follows project conventions
- Tests are included for new features
- No security vulnerabilities
- Documentation updated if needed

**Authors should:**
- Keep PRs focused and small
- Respond to feedback promptly
- Squash commits before merge if needed

### 6. Daily Standup Format

Answer these questions:
1. What did I complete yesterday?
2. What will I work on today?
3. Are there any blockers?

Update JIRA ticket status accordingly.

## Code Standards

- Use ESLint and Prettier configurations
- Write meaningful variable/function names
- Add comments for complex logic
- Follow existing patterns in codebase

## Testing

```bash
# Run all tests
npm run test

# Run with coverage
npm run test -- --coverage
```

## Questions?

- Slack: #mr-guide-dev
- JIRA: [Project Link]
