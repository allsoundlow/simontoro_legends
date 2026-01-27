# Docker Guidelines

> Related PRD: #[[file:docs/PRD-infrastructure.md]] (Requirement 6: Data Persistence)

## Overview
Docker is used for local development infrastructure only (PostgreSQL, Redis). The application itself runs directly on the host via `yarn dev`.

## Services
- **postgres** - PostgreSQL 18 (Alpine) for persistent storage
- **redis** - Redis 8 (Alpine) for caching and rate limiting

## Environment Setup
1. Copy `.env.example` to `.env` in the root directory
2. Fill in the required values

Note: `.env` is gitignored and only used by Docker Compose - the application uses JSON config files.

## Common Commands

```bash
# Start all services (from root directory)
docker compose up -d

# Stop all services
docker compose down

# Stop and remove volumes (reset data)
docker compose down -v

# View logs
docker compose logs -f           # All services
docker compose logs -f postgres  # Specific service

# Check service status
docker compose ps

# Restart a specific service
docker compose restart postgres
```

## Connecting to Services

### PostgreSQL
```bash
# Via psql in container
docker compose exec postgres psql -U bot -d saimontoro

# From host (requires psql installed)
psql -h localhost -p 5432 -U bot -d saimontoro
```

Connection string for app config:
```json
{
  "database": {
    "host": "localhost",
    "port": 5432,
    "database": "saimontoro",
    "user": "bot",
    "password": "secret"
  }
}
```

### Redis
```bash
# Via redis-cli in container
docker compose exec redis redis-cli

# From host (requires redis-cli installed)
redis-cli -h localhost -p 6379
```

## Health Checks
Both services have health checks configured:
- PostgreSQL: `pg_isready` command
- Redis: `redis-cli ping`

Check health status:
```bash
docker compose ps  # Shows health status in output
```

## Data Persistence
Data is persisted in Docker volumes:
- `postgres_data` - PostgreSQL data
- `redis_data` - Redis data

Volumes survive `docker compose down` but are removed with `docker compose down -v`.

## Development Workflow
1. Start infrastructure: `docker compose up -d`
2. Run app: `cd pkg/bot && yarn dev`
3. Stop when done: `docker compose down`

## Troubleshooting

### Port conflicts
If ports are in use, change them in `.env`:
```bash
POSTGRES_PORT=5433
REDIS_PORT=6380
```

### Reset database
```bash
docker compose down -v
docker compose up -d
# Run migrations again
```

### View container logs for errors
```bash
docker compose logs postgres --tail=50
docker compose logs redis --tail=50
```
