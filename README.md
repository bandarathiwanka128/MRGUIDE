# MR Guide

Full-stack application with React frontend and Node.js/Express backend with PostgreSQL database.

## Prerequisites

- Node.js 18+
- PostgreSQL 15+
- Git
- Docker & Docker Compose (optional, but recommended)

## Quick Start

### Option 1: Using Docker (Recommended)

```bash
# Clone repository
git clone <your-repo-url>
cd mr-guide

# Start all services
docker-compose up -d

# Access the application
# Frontend: http://localhost:3000
# Backend API: http://localhost:3001
```

### Option 2: Local Development

```bash
# Clone repository
git clone <your-repo-url>
cd mr-guide

# Install all dependencies
npm run install:all

# Configure environment variables
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local

# Edit the .env files with your configurations

# Start PostgreSQL locally and create database
psql -U postgres -c "CREATE DATABASE mrguide;"

# Run migrations (if available)
npm run db:migrate

# Start development servers
npm run dev
```

## Project Structure

```
mr-guide/
├── .github/
│   └── workflows/
│       └── ci.yml          # CI/CD pipeline
├── backend/
│   ├── config/             # Configuration files
│   ├── middleware/         # Express middleware
│   ├── routes/             # API routes
│   ├── scripts/            # Database scripts
│   ├── .env.example        # Environment template
│   ├── Dockerfile
│   ├── package.json
│   └── server.js           # Entry point
├── frontend/
│   ├── public/
│   ├── src/
│   ├── .env.example        # Environment template
│   ├── Dockerfile
│   └── package.json
├── .gitignore
├── docker-compose.yml
├── package.json            # Root workspace config
└── README.md
```

## Environment Variables

### Backend (.env)

| Variable | Description | Default |
|----------|-------------|---------|
| PORT | Server port | 3001 |
| NODE_ENV | Environment | development |
| DB_HOST | Database host | localhost |
| DB_PORT | Database port | 5432 |
| DB_NAME | Database name | mrguide |
| DB_USER | Database user | postgres |
| DB_PASSWORD | Database password | - |
| JWT_SECRET | JWT signing secret | - |
| CORS_ORIGIN | Frontend URL | http://localhost:3000 |

### Frontend (.env.local)

| Variable | Description |
|----------|-------------|
| REACT_APP_API_URL | Backend API URL |
| REACT_APP_GOOGLE_MAPS_API_KEY | Google Maps API key |

## Available Scripts

### Root Level

| Command | Description |
|---------|-------------|
| `npm run dev` | Start both frontend and backend in development mode |
| `npm run start` | Start both services in production mode |
| `npm run build` | Build frontend for production |
| `npm run test` | Run all tests |
| `npm run lint` | Lint all code |
| `npm run docker:up` | Start Docker containers |
| `npm run docker:down` | Stop Docker containers |
| `npm run install:all` | Install all dependencies |

## Git Workflow

### Branch Strategy

- `main` - Production-ready code
- `develop` - Integration branch for features
- `feature/JIRA-XXX-description` - Feature branches
- `bugfix/JIRA-XXX-description` - Bug fix branches

### Commit Convention

Link commits to JIRA tickets:

```bash
git commit -m "JIRA-123: Add user authentication feature"

# With time tracking
git commit -m "JIRA-123 #comment Fixed login validation #time 2h"
```

### Pull Request Process

1. Create feature branch from `develop`
2. Make changes and commit with JIRA reference
3. Push branch and create PR
4. Request code review
5. Merge after approval

## Development Workflow

### For Team Members

1. Pull latest changes:
   ```bash
   git checkout develop
   git pull origin develop
   ```

2. Create feature branch:
   ```bash
   git checkout -b feature/JIRA-XXX-feature-name
   ```

3. Make changes, commit, and push:
   ```bash
   git add .
   git commit -m "JIRA-XXX: Description of changes"
   git push origin feature/JIRA-XXX-feature-name
   ```

4. Create Pull Request on GitHub/GitLab

## API Documentation

Base URL: `http://localhost:3001/api`

### Health Check
```
GET /api/health
```

## Testing

```bash
# Run all tests
npm run test

# Run frontend tests only
npm run test:frontend

# Run backend tests only
npm run test:backend
```

## Deployment

The CI/CD pipeline automatically:
1. Runs tests on every push
2. Builds Docker images on main/develop
3. (Configure deployment to your hosting service)

## Troubleshooting

### Database Connection Issues
- Ensure PostgreSQL is running
- Check `.env` database credentials
- Verify database exists: `psql -U postgres -c "\l"`

### Port Already in Use
```bash
# Find process using port
netstat -ano | findstr :3000
# Kill process (Windows)
taskkill /PID <pid> /F
```

### Docker Issues
```bash
# Rebuild containers
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

## Team Contact

- JIRA Project: [Link to JIRA]
- Slack Channel: #mr-guide-dev

## License

ISC
