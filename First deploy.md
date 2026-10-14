# First deploy

This guide explains how to run and test the portfolio locally before opening a pull request.

## First-time setup

Clone the repository and install its dependencies:

```bash
git clone <repository-url>
cd about-me
corepack enable
pnpm install
```

Create the local environment files:

```bash
cp infra/.env.example infra/.env
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
```

Set a local PostgreSQL password in `infra/.env`. Use the same password in the
`DATABASE_URL` inside `apps/api/.env`.

## Start the development environment

Start PostgreSQL:

```bash
docker compose -f infra/docker-compose.yml up -d postgres
```

Apply the existing database migrations:

```bash
pnpm --filter @portfolio/api prisma:migrate
```

Start the API in one terminal:

```bash
pnpm --filter @portfolio/api dev
```

Start the website in a second terminal:

```bash
pnpm dev
```

The local services are available at:

- Website: <http://localhost:5173>
- API: <http://localhost:3000>
- API health check: <http://localhost:3000/health>

Vite refreshes the browser after frontend changes, while Nest restarts the API
after backend changes.

## Test API requests

Test the health endpoint:

```bash
curl http://localhost:3000/health
```

Test the contact endpoint:

```bash
curl -i -X POST http://localhost:3000/contact \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "message": "Local API test"
  }'
```

## Test a new database table

1. Add the model to `apps/api/prisma/schema.prisma`.
2. Generate and apply a development migration:

   ```bash
   pnpm --filter @portfolio/api exec prisma migrate dev --name add_my_table
   ```

3. Inspect the generated SQL under `apps/api/prisma/migrations/`.
4. Open Prisma Studio:

   ```bash
   pnpm --filter @portfolio/api exec prisma studio
   ```

Prisma Studio normally opens at <http://localhost:5555>.

These operations affect only the local PostgreSQL container, not production.
Database data remains in its Docker volume after the containers stop.

To delete the local database data intentionally, run:

```bash
docker compose -f infra/docker-compose.yml down -v
```

Do not include `-v` unless you intend to erase the local data.

## Run a production-like local test

Build and run the complete local stack:

```bash
docker compose -f infra/docker-compose.yml up -d --build
docker compose -f infra/docker-compose.yml ps
```

The services are then available at:

- Website: <http://localhost:8080>
- API: <http://localhost:3000>
- Umami: <http://localhost:3001>

This resembles production but does not start the Cloudflare Tunnel or monitoring
profiles.

Stop the stack without deleting its volumes:

```bash
docker compose -f infra/docker-compose.yml down
```

## Check changes before opening a pull request

Run the same main quality checks used by CI:

```bash
pnpm install --frozen-lockfile
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test:coverage
pnpm test:e2e
```

Before running browser tests for the first time, install Chromium:

```bash
pnpm --filter @portfolio/web exec playwright install --with-deps chromium
```
