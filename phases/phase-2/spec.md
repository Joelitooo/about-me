# Phase 2 - Technical Specification

> Part of the [Portfolio Fullstack Monorepo](../../MAIN_PLAN.md) plan. High-level overview in [`plan.md`](plan.md).

This document is the implementation contract for Phase 2. It is written for an agent (or developer) to follow top-to-bottom. Each section gives the exact file path, its full contents (for config/infra) or representative skeleton (for Nest modules), and the commands to run. Phase 2 **creates `apps/api` from scratch** — there is no existing Nest scaffold.

---

## 1. Scope

**In scope**

- Scaffold `apps/api` as a NestJS TypeScript package (`@portfolio/api`) in the pnpm workspace.
- Prisma + PostgreSQL: schema and first migration for `ContactMessage` and `PageEvent`.
- App bootstrap: `@nestjs/config`, global `ValidationPipe`, Helmet, `@nestjs/throttler`, CORS for the web origin, structured logging.
- Modules: `HealthModule` (`GET /health`), `ContactModule` (`POST /contact`).
- Register `apps/api` in the root Vitest workspace (`node` env).
- Unit tests (services/controllers), HTTP integration tests (Supertest), DB-backed tests (Testcontainers PostgreSQL).

**Out of scope (later phases)**

- Umami container / tracking script (Phase 3). `PageEvent` is schema-only in this phase — no public events API required yet.
- Dockerfiles / Compose (Phase 4).
- Cloudflare Tunnel / Pi deploy (Phase 5).
- CI enforcement of coverage thresholds (Phase 6) — define thresholds locally here; CI wires them later.
- Auth, admin UI for contact messages, email notifications.

## 2. Conventions

- **Package manager:** pnpm (via Corepack). Never use `npm`/`yarn` in this repo.
- **Language:** TypeScript, `strict` mode on. Nest uses **decorators** — enable `experimentalDecorators` and `emitDecoratorMetadata` in the API `tsconfig`.
- **Module system:** Nest’s default toolchain is **CommonJS** for the compiled API. Prefer Nest-friendly `tsconfig` (`module: "CommonJS"`, `moduleResolution: "Node"`) for `apps/api` even though the monorepo root uses ESM/Bundler. Do **not** force `verbatimModuleSyntax` in the API package if it fights Nest/Prisma decorators; override or omit it in `apps/api/tsconfig.json`.
- **Shared types:** import DTOs/shapes from `@portfolio/shared`. Runtime validation uses `class-validator` DTOs that **mirror** `ContactMessageDto` (interfaces are not available at runtime).
- **Unit tests:** co-locate as `*.test.ts` next to source (or under the same folder).
- **HTTP / DB integration tests:** under `apps/api/test/`.
- **Env vars:** loaded via `@nestjs/config` from `apps/api/.env` (gitignored). Document in `.env.example`.
- **API port:** `3000` (matches `apps/web` default `VITE_API_URL`).
- **Package name:** `@portfolio/api`.

## 3. Prerequisites

1. Phase 0 complete: `pnpm install`, `pnpm typecheck`, `pnpm lint`, `pnpm test` pass at the repo root.
2. Phase 1 web client expects:
   - `GET /health` → `HealthStatus` JSON
   - `POST /contact` with JSON `{ name, email, message }` → success on `2xx` (empty body is fine)
3. Docker daemon running (for Testcontainers).
4. Create a feature branch before making any changes:

```bash
git checkout -b feature/phase-2
```

All Phase 2 work happens on this branch. Do not commit directly to `main`.

## 4. Target file tree

```
about-me/
├── apps/
│   └── api/
│       ├── prisma/
│       │   ├── schema.prisma
│       │   └── migrations/
│       │       └── <timestamp>_init/
│       │           └── migration.sql
│       ├── src/
│       │   ├── main.ts
│       │   ├── app.module.ts
│       │   ├── prisma/
│       │   │   ├── prisma.module.ts
│       │   │   └── prisma.service.ts
│       │   ├── health/
│       │   │   ├── health.module.ts
│       │   │   ├── health.controller.ts
│       │   │   ├── health.service.ts
│       │   │   └── health.controller.test.ts
│       │   └── contact/
│       │       ├── contact.module.ts
│       │       ├── contact.controller.ts
│       │       ├── contact.service.ts
│       │       ├── contact.service.test.ts
│       │       └── dto/
│       │           └── create-contact-message.dto.ts
│       ├── test/
│       │   ├── app.e2e-spec.ts
│       │   └── helpers.ts
│       ├── .env.example
│       ├── nest-cli.json
│       ├── package.json
│       ├── tsconfig.json
│       ├── tsconfig.build.json
│       └── vitest.config.ts
└── vitest.workspace.ts                 # append api project
```

## 5. File-by-file specification

Create each file as specified. Module/controller/service bodies may vary slightly in style, but routes, DTO fields, status codes, and Prisma models must match.

### 5.1 Scaffold package + install dependencies

From the repo root:

```bash
mkdir -p apps/api/src apps/api/test apps/api/prisma

# Create package.json first (section 5.3), then:

pnpm --filter @portfolio/api add \
  @nestjs/common @nestjs/core @nestjs/platform-express @nestjs/config @nestjs/throttler \
  @prisma/client reflect-metadata rxjs \
  class-validator class-transformer helmet \
  @portfolio/shared@workspace:*

pnpm --filter @portfolio/api add -D \
  @nestjs/cli @nestjs/testing \
  prisma typescript \
  @types/express @types/node @types/supertest \
  supertest \
  @testcontainers/postgresql testcontainers \
  unplugin-swc @swc/core \
  vitest
```

> Root already has `vitest`; adding it as a filter devDependency is optional if the workspace runner resolves it. Prefer configuring the API project via `vitest.workspace.ts` + a local `vitest.config.ts` that enables Nest decorator transforms (SWC).

If `@nestjs/cli` scaffolding is preferred over hand-written files, run it **into** `apps/api` and then reshape to match this spec (package name, Prisma layout, Vitest instead of Jest). Hand-writing the files below is the default path.

### 5.2 `apps/api/.env.example`

```env
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://portfolio:portfolio@localhost:5432/portfolio?schema=public
CORS_ORIGIN=http://localhost:5173
THROTTLE_TTL_MS=60000
THROTTLE_LIMIT=20
```

Copy to `apps/api/.env` locally (gitignored by root `.gitignore`).

**What these mean**

| Variable       | Purpose                                                                              |
| -------------- | ------------------------------------------------------------------------------------ |
| `DATABASE_URL` | Prisma connection string for the app database                                        |
| `CORS_ORIGIN`  | Allowed browser origin for `apps/web` (comma-separated list allowed if needed later) |
| `THROTTLE_*`   | Global rate limit window and max requests per IP                                     |

### 5.3 `apps/api/package.json`

```json
{
  "name": "@portfolio/api",
  "version": "0.0.0",
  "private": true,
  "scripts": {
    "dev": "nest start --watch",
    "build": "nest build",
    "start": "node dist/main.js",
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "prisma:generate": "prisma generate",
    "prisma:migrate": "prisma migrate dev",
    "prisma:deploy": "prisma migrate deploy"
  },
  "dependencies": {
    "@nestjs/common": "...",
    "@nestjs/config": "...",
    "@nestjs/core": "...",
    "@nestjs/platform-express": "...",
    "@nestjs/throttler": "...",
    "@portfolio/shared": "workspace:*",
    "@prisma/client": "...",
    "class-transformer": "...",
    "class-validator": "...",
    "helmet": "...",
    "reflect-metadata": "...",
    "rxjs": "..."
  },
  "devDependencies": {
    "@nestjs/cli": "...",
    "@nestjs/testing": "...",
    "@swc/core": "...",
    "@testcontainers/postgresql": "...",
    "@types/express": "...",
    "@types/node": "...",
    "@types/supertest": "...",
    "prisma": "...",
    "supertest": "...",
    "testcontainers": "...",
    "typescript": "^5.5.0",
    "unplugin-swc": "...",
    "vitest": "..."
  }
}
```

> `"..."` means versions resolved by `pnpm add`. Lockfile is source of truth.

### 5.4 `apps/api/tsconfig.json`

Nest needs decorator metadata and Node/CommonJS resolution.

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "module": "CommonJS",
    "moduleResolution": "Node",
    "outDir": "dist",
    "rootDir": "src",
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "verbatimModuleSyntax": false,
    "declaration": false,
    "declarationMap": false,
    "paths": {
      "@shared/*": ["../../packages/shared/src/*"]
    }
  },
  "include": ["src"]
}
```

### 5.5 `apps/api/tsconfig.build.json`

```json
{
  "extends": "./tsconfig.json",
  "exclude": ["node_modules", "dist", "test", "**/*.test.ts", "**/*spec.ts"]
}
```

### 5.6 `apps/api/nest-cli.json`

```json
{
  "$schema": "https://json.schemastore.org/nest-cli",
  "collection": "@nestjs/schematics",
  "sourceRoot": "src",
  "compilerOptions": {
    "tsConfigPath": "tsconfig.build.json",
    "deleteOutDir": true
  }
}
```

### 5.7 `apps/api/prisma/schema.prisma`

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model ContactMessage {
  id        String   @id @default(cuid())
  name      String
  email     String
  message   String
  createdAt DateTime @default(now()) @map("created_at")

  @@map("contact_messages")
}

/// Optional custom tracking alongside Umami (Phase 3). Schema only in Phase 2.
model PageEvent {
  id        String   @id @default(cuid())
  name      String
  path      String
  timestamp DateTime
  locale    String?
  metadata  Json?
  createdAt DateTime @default(now()) @map("created_at")

  @@map("page_events")
}
```

Create the first migration after `DATABASE_URL` points at a running Postgres:

```bash
pnpm --filter @portfolio/api exec prisma migrate dev --name init
pnpm --filter @portfolio/api exec prisma generate
```

### 5.8 `apps/api/src/prisma/prisma.service.ts`

```ts
import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
```

### 5.9 `apps/api/src/prisma/prisma.module.ts`

```ts
import { Global, Module } from "@nestjs/common";

import { PrismaService } from "./prisma.service";

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
```

### 5.10 `apps/api/src/health/health.service.ts`

```ts
import { Injectable } from "@nestjs/common";
import type { HealthStatus } from "@portfolio/shared";

import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class HealthService {
  private readonly startedAt = Date.now();

  constructor(private readonly prisma: PrismaService) {}

  async getHealth(): Promise<HealthStatus> {
    let status: HealthStatus["status"] = "ok";
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      status = "degraded";
    }

    return {
      status,
      uptimeSeconds: Math.floor((Date.now() - this.startedAt) / 1000),
    };
  }
}
```

### 5.11 `apps/api/src/health/health.controller.ts`

```ts
import { Controller, Get } from "@nestjs/common";
import type { HealthStatus } from "@portfolio/shared";

import { HealthService } from "./health.service";

@Controller("health")
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  getHealth(): Promise<HealthStatus> {
    return this.healthService.getHealth();
  }
}
```

### 5.12 `apps/api/src/health/health.module.ts`

```ts
import { Module } from "@nestjs/common";

import { HealthController } from "./health.controller";
import { HealthService } from "./health.service";

@Module({
  controllers: [HealthController],
  providers: [HealthService],
})
export class HealthModule {}
```

### 5.13 `apps/api/src/health/health.controller.test.ts`

Unit test with a mocked `HealthService` (or mock `PrismaService` if testing the service). At minimum:

```ts
import { Test } from "@nestjs/testing";
import { describe, expect, it, vi } from "vitest";

import { HealthController } from "./health.controller";
import { HealthService } from "./health.service";

describe("HealthController", () => {
  it("returns health status from the service", async () => {
    const mockHealth = { status: "ok" as const, uptimeSeconds: 42 };
    const moduleRef = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: HealthService,
          useValue: { getHealth: vi.fn().mockResolvedValue(mockHealth) },
        },
      ],
    }).compile();

    const controller = moduleRef.get(HealthController);
    await expect(controller.getHealth()).resolves.toEqual(mockHealth);
  });
});
```

### 5.14 `apps/api/src/contact/dto/create-contact-message.dto.ts`

Runtime validation mirroring `@portfolio/shared` `ContactMessageDto`.

```ts
import { IsEmail, IsString, MaxLength, MinLength } from "class-validator";

export class CreateContactMessageDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;

  @IsEmail()
  @MaxLength(254)
  email!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  message!: string;
}
```

### 5.15 `apps/api/src/contact/contact.service.ts`

```ts
import { Injectable } from "@nestjs/common";

import { PrismaService } from "../prisma/prisma.service";
import type { CreateContactMessageDto } from "./dto/create-contact-message.dto";

@Injectable()
export class ContactService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateContactMessageDto): Promise<void> {
    await this.prisma.contactMessage.create({
      data: {
        name: dto.name,
        email: dto.email,
        message: dto.message,
      },
    });
  }
}
```

### 5.16 `apps/api/src/contact/contact.controller.ts`

```ts
import { Body, Controller, HttpCode, HttpStatus, Post } from "@nestjs/common";

import { ContactService } from "./contact.service";
import { CreateContactMessageDto } from "./dto/create-contact-message.dto";

@Controller("contact")
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateContactMessageDto): Promise<void> {
    await this.contactService.create(dto);
  }
}
```

### 5.17 `apps/api/src/contact/contact.module.ts`

```ts
import { Module } from "@nestjs/common";

import { ContactController } from "./contact.controller";
import { ContactService } from "./contact.service";

@Module({
  controllers: [ContactController],
  providers: [ContactService],
})
export class ContactModule {}
```

### 5.18 `apps/api/src/contact/contact.service.test.ts`

```ts
import { Test } from "@nestjs/testing";
import { describe, expect, it, vi } from "vitest";

import { PrismaService } from "../prisma/prisma.service";
import { ContactService } from "./contact.service";

describe("ContactService", () => {
  it("persists a contact message", async () => {
    const create = vi.fn().mockResolvedValue({ id: "1" });
    const moduleRef = await Test.createTestingModule({
      providers: [
        ContactService,
        {
          provide: PrismaService,
          useValue: { contactMessage: { create } },
        },
      ],
    }).compile();

    const service = moduleRef.get(ContactService);
    await service.create({
      name: "Ada",
      email: "ada@example.com",
      message: "Hello",
    });

    expect(create).toHaveBeenCalledWith({
      data: { name: "Ada", email: "ada@example.com", message: "Hello" },
    });
  });
});
```

### 5.19 `apps/api/src/app.module.ts`

```ts
import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { APP_GUARD } from "@nestjs/core";

import { ContactModule } from "./contact/contact.module";
import { HealthModule } from "./health/health.module";
import { PrismaModule } from "./prisma/prisma.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env"],
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        {
          ttl: Number(config.get("THROTTLE_TTL_MS", 60_000)),
          limit: Number(config.get("THROTTLE_LIMIT", 20)),
        },
      ],
    }),
    PrismaModule,
    HealthModule,
    ContactModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
```

> Note: `@nestjs/throttler` v5+ uses `{ throttlers: [{ ttl, limit }] }` in some versions — match the installed package’s `forRoot` / `forRootAsync` API if the snippet above fails typecheck.

### 5.20 `apps/api/src/main.ts`

```ts
import "reflect-metadata";

import { Logger, ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import helmet from "helmet";

import { AppModule } from "./app.module";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    logger: ["log", "error", "warn", "debug"],
  });

  const config = app.get(ConfigService);
  const port = Number(config.get("PORT", 3000));
  const corsOrigin = config.get<string>("CORS_ORIGIN", "http://localhost:5173");

  app.use(helmet());
  app.enableCors({
    origin: corsOrigin.split(",").map((value) => value.trim()),
    methods: ["GET", "POST", "OPTIONS"],
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.listen(port);
  Logger.log(`API listening on http://localhost:${port}`, "Bootstrap");
}

void bootstrap();
```

### 5.21 `apps/api/vitest.config.ts`

Nest + Vitest needs a transform that preserves decorator metadata (SWC).

```ts
import swc from "unplugin-swc";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: false,
    environment: "node",
    include: ["src/**/*.test.ts", "test/**/*.e2e-spec.ts"],
    fileParallelism: false,
    hookTimeout: 120_000,
    testTimeout: 120_000,
    coverage: {
      provider: "v8",
      reportsDirectory: "./coverage",
      thresholds: {
        lines: 60,
        functions: 60,
        branches: 50,
        statements: 60,
      },
    },
  },
  plugins: [
    swc.vite({
      module: { type: "es6" },
    }),
  ],
});
```

> If SWC plugin options differ by version, adjust to emit decorator metadata (`jsc.transform.decoratorMetadata: true`, `jsc.parser.decorators: true`).

### 5.22 Root `vitest.workspace.ts`

Append the `api` project (replace the Phase 2 comment).

```ts
import { defineWorkspace } from "vitest/config";

export default defineWorkspace([
  {
    test: {
      name: "shared",
      root: "./packages/shared",
      environment: "node",
      include: ["src/**/*.test.ts"],
    },
  },
  {
    test: {
      name: "web",
      root: "./apps/web",
      environment: "jsdom",
      include: ["src/**/*.test.{ts,tsx}"],
      setupFiles: ["./src/test/setup.ts"],
    },
  },
  {
    test: {
      name: "api",
      root: "./apps/api",
      environment: "node",
      include: ["src/**/*.test.ts", "test/**/*.e2e-spec.ts"],
      fileParallelism: false,
      hookTimeout: 120_000,
      testTimeout: 120_000,
    },
    plugins: [], // prefer apps/api/vitest.config.ts via workspace path form below if needed
  },
]);
```

**Preferred workspace entry** (loads the API Vitest config with SWC):

```ts
export default defineWorkspace([
  // ... shared + web entries ...
  "./apps/api/vitest.config.ts",
]);
```

Use whichever form Vitest 2 accepts in this repo; the API project **must** run under `node` and pick up the SWC plugin.

### 5.23 `apps/api/test/helpers.ts`

Shared Testcontainers bootstrap for DB-backed tests.

```ts
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { execSync } from "node:child_process";
import path from "node:path";

export async function startPostgres(): Promise<StartedPostgreSqlContainer> {
  const container = await new PostgreSqlContainer("postgres:16-alpine").start();
  process.env.DATABASE_URL = container.getConnectionUri();

  execSync("pnpm exec prisma migrate deploy", {
    cwd: path.resolve(__dirname, ".."),
    env: { ...process.env },
    stdio: "inherit",
  });

  return container;
}
```

### 5.24 `apps/api/test/app.e2e-spec.ts`

Supertest against the booted Nest app + Testcontainers Postgres.

```ts
import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import type { StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { AppModule } from "../src/app.module";
import { startPostgres } from "./helpers";

describe("API (e2e)", () => {
  let app: INestApplication;
  let container: StartedPostgreSqlContainer;

  beforeAll(async () => {
    container = await startPostgres();

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  }, 120_000);

  afterAll(async () => {
    await app?.close();
    await container?.stop();
  });

  it("GET /health returns ok", async () => {
    const res = await request(app.getHttpServer()).get("/health").expect(200);
    expect(res.body.status).toBe("ok");
    expect(typeof res.body.uptimeSeconds).toBe("number");
  });

  it("POST /contact validates and persists", async () => {
    await request(app.getHttpServer())
      .post("/contact")
      .send({ name: "Ada", email: "ada@example.com", message: "Hello" })
      .expect(201);

    await request(app.getHttpServer())
      .post("/contact")
      .send({ name: "", email: "not-an-email", message: "" })
      .expect(400);
  });
});
```

### 5.25 Local Postgres for `dev` (recommended)

For day-to-day `nest start --watch`, run a disposable Postgres (Compose arrives in Phase 4):

```bash
docker run --name portfolio-pg -e POSTGRES_USER=portfolio -e POSTGRES_PASSWORD=portfolio \
  -e POSTGRES_DB=portfolio -p 5432:5432 -d postgres:16-alpine
```

Then:

```bash
cp apps/api/.env.example apps/api/.env
pnpm --filter @portfolio/api prisma:migrate
pnpm --filter @portfolio/api prisma:generate
```

## 6. Execution order (commands)

Run from the repo root (`/home/joelito/about-me`), in this order:

```bash
# 0. Feature branch
git checkout -b feature/phase-2

# 1. Create package files (sections 5.3–5.6, 5.21) and source tree (5.8–5.20)

# 2. Install dependencies (section 5.1)

# 3. Env + local Postgres (section 5.25)
cp apps/api/.env.example apps/api/.env
# start postgres (docker run …) if not already running

# 4. Prisma migrate + generate (section 5.7)
pnpm --filter @portfolio/api exec prisma migrate dev --name init
pnpm --filter @portfolio/api exec prisma generate

# 5. Update root vitest.workspace.ts (section 5.22)
pnpm install

# 6. Verify
pnpm typecheck
pnpm lint
pnpm test
pnpm --filter @portfolio/api build

# 7. Manual smoke
pnpm --filter @portfolio/api dev
# curl http://localhost:3000/health
# curl -X POST http://localhost:3000/contact -H 'content-type: application/json' \
#   -d '{"name":"Ada","email":"ada@example.com","message":"Hi"}'
# Optional: submit the web contact form against the running API

# 8. Commit on feature/phase-2
git add apps/api vitest.workspace.ts pnpm-lock.yaml packages/shared # only if shared changed
git commit -m "feat(api): NestJS + Prisma health and contact modules (phase 2)"
```

## 7. Acceptance criteria

Phase 2 is complete when **all** of the following hold:

- [ ] `apps/api` exists as `@portfolio/api` and is part of the pnpm workspace.
- [ ] `pnpm --filter @portfolio/api dev` listens on port 3000.
- [ ] `GET /health` returns JSON matching `HealthStatus` (`status`, `uptimeSeconds`); status is `ok` when DB is reachable.
- [ ] `POST /contact` with a valid body returns `201` and persists a `ContactMessage` row.
- [ ] Invalid `POST /contact` bodies return `400` (validation pipe).
- [ ] Helmet security headers are present on responses.
- [ ] Rate limiting is active (global throttler guard configured).
- [ ] CORS allows `CORS_ORIGIN` (default `http://localhost:5173`).
- [ ] Prisma schema includes `ContactMessage` and `PageEvent`; an `init` migration exists.
- [ ] Root `vitest.workspace.ts` includes the `api` project.
- [ ] Unit tests for health and contact pass.
- [ ] `test/app.e2e-spec.ts` passes with Supertest + Testcontainers (Docker required).
- [ ] `pnpm typecheck`, `pnpm lint`, `pnpm test`, and `pnpm --filter @portfolio/api build` succeed.
- [ ] Web contact form can successfully submit to the running API (manual check).

## 8. Testing architecture

Phase 2 adds the **API testing layer** on top of the Phase 0/1 foundation.

- **Unit:** Vitest + `@nestjs/testing`. Mock `PrismaService` / collaborators. Co-locate as `src/**/*.test.ts`.
- **HTTP integration:** Supertest against `INestApplication` from `Test.createTestingModule({ imports: [AppModule] })`.
- **DB integration:** Testcontainers PostgreSQL (`postgres:16-alpine`). Run `prisma migrate deploy` against the container URL before tests. Prefer `fileParallelism: false` and elevated timeouts — container startup is slow on ARM/Pi-class hosts too.
- **Coverage:** local thresholds in `apps/api/vitest.config.ts` (≈60% lines/functions); CI gate comes in Phase 6.
- **Runner decision:** Vitest (not Jest) for monorepo consistency. If Nest decorator metadata cannot be made reliable with SWC within a reasonable time, fall back to Jest **only for `apps/api`** and document the exception in this phase’s PR — do not switch the whole repo.

## 9. Notes & decisions

- **Prisma major version:** pin **Prisma 6.x** (`prisma` + `@prisma/client`). Prisma 7 removed `url` from `schema.prisma` (requires `prisma.config.ts` / driver adapters). Stay on 6 until Phase 4/later deliberately upgrades.
- **`PageEvent` is schema-only** in Phase 2. Custom event ingestion can wait until after Umami (Phase 3) if still desired; the table exists so migrations stay forward-compatible.
- **Validation DTOs vs shared interfaces:** `@portfolio/shared` exports `ContactMessageDto` as a TypeScript `interface` (erase at compile time). Nest needs a class with `class-validator` decorators. Keep field names/types aligned manually; do not try to decorate the shared interface.
- **Nest tsconfig overrides:** decorators + CommonJS/`Node` resolution are intentional exceptions to the root ESM/Bundler baseline.
- **Prisma lives in `apps/api/prisma`** (not a separate package) to keep Phase 2 small; extract later only if another app needs the same client.
- **No global API prefix** (`/api/v1`) — web client calls `/health` and `/contact` on the API host directly. Cloudflare will map `api.*` to this service in Phase 5.
- **Structured logging:** Nest’s built-in logger is enough for Phase 2. Avoid adding pino/winston unless you already want it; keep log lines clear (`Bootstrap`, module context).
- Exact dependency versions float within ranges; the lockfile is the source of truth. Bump majors deliberately.
