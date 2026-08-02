# Portfolio Q&A

## Where does the code live? Does the website go down if the Pi goes down?

The project exists in three main places:

- The source code is stored in GitHub and in local clones of the repository.
- GitHub Actions builds Docker images and stores them in GitHub Container Registry.
- The running website, API, PostgreSQL database, Umami, and Cloudflare Tunnel run
  on the Raspberry Pi.

Cloudflare provides public DNS, HTTPS, and the secure tunnel, but it does not run
the application. If the Pi loses power or internet access, the website, API,
contact form, and analytics become unavailable. The source code and built images
remain safe on GitHub.

There is currently no automatic failover to another server. Uptime Kuma also
runs on the Pi, so it cannot report a complete Pi power or network failure.

## What is a second deployment target?

A second deployment target is another machine or service capable of running the
application if the Pi is unavailable.

Examples include:

- A cloud VPS from Hetzner, DigitalOcean, Linode, AWS Lightsail, or Vultr.
- A second Raspberry Pi, preferably in another location and on another internet
  connection.
- Managed services such as Cloudflare Pages for the frontend, Render or Fly.io
  for the API, and Neon or Supabase for PostgreSQL.

True automatic failover also requires traffic routing, synchronized data,
matching secrets and configuration, external monitoring, and usually database
replication. The simplest reliability improvement would be moving the complete
Docker stack to a VPS. A useful hybrid option would be hosting the static
frontend on a CDN while keeping the API on the Pi.

## How can I run and test changes locally before opening a PR?

The repository supports local development and production-like Docker testing.
The detailed instructions are in [`First deploy.md`](First%20deploy.md).

The usual development flow is:

1. Install dependencies with `pnpm install`.
2. Create local environment files from the provided `.env.example` files.
3. Start PostgreSQL with Docker Compose.
4. Apply Prisma migrations.
5. Run the NestJS API at <http://localhost:3000>.
6. Run the Vite frontend at <http://localhost:5173>.
7. Test API requests with `curl`, Postman, or another HTTP client.
8. Use Prisma Studio to inspect local database records.
9. Run formatting, linting, type checking, unit tests, coverage, and Playwright
   tests before opening a PR.

The full Docker stack can also be built locally. It serves the website at
<http://localhost:8080>, the API at <http://localhost:3000>, and Umami at
<http://localhost:3001>.

## What is Prisma?

Prisma is a database toolkit for TypeScript and Node.js. It connects the NestJS
API to PostgreSQL.

It provides:

- A schema file that describes database models, fields, and relationships.
- A generated, type-safe TypeScript client for database queries.
- Migrations that record and apply database structure changes.
- Prisma Studio, a browser interface for inspecting and editing local records.

The request flow is:

```text
Browser → NestJS API → Prisma → PostgreSQL
```

Prisma is not the database. PostgreSQL stores the data; Prisma is the interface
the application uses to query and modify it.

## Is Prisma an alternative to GraphQL?

No. They solve different problems and can be used together.

- Prisma connects server-side code to a database.
- GraphQL defines how clients request data from an API.

The current architecture is:

```text
React → REST API → NestJS → Prisma → PostgreSQL
```

A GraphQL version could be:

```text
React → GraphQL API → NestJS → Prisma → PostgreSQL
```

Alternatives to Prisma include Drizzle, TypeORM, Sequelize, Knex, and raw SQL.
Alternatives to GraphQL include REST, tRPC, and gRPC.

## What are REST, tRPC, and gRPC?

### REST

REST stands for **Representational State Transfer**. It organizes an API around
HTTP URLs and methods such as:

```text
GET    /messages
POST   /contact
PATCH  /messages/123
DELETE /messages/123
```

It commonly uses JSON and is simple to test from browsers, `curl`, mobile
applications, and almost any programming language. This portfolio uses REST.

### tRPC

tRPC is a TypeScript-focused Remote Procedure Call framework. It allows a
TypeScript frontend to call backend procedures with types inferred directly
from the server.

Its main benefit is strong end-to-end type safety and fast development when
both sides use TypeScript. Its trade-offs are tighter frontend/backend coupling
and less convenient use from clients written in other languages.

### gRPC

gRPC stands for **Google Remote Procedure Call**. It defines services with
Protocol Buffers and normally sends compact binary messages over HTTP/2.

It is fast, supports streaming, and works well between internal services in
different languages. It is less convenient to inspect manually and normally
requires extra infrastructure for browser clients.

## Since both frontend and backend use TypeScript, should this project use tRPC?

tRPC would be technically viable, but REST remains a good choice for this
project.

REST fits because:

- The API currently has only a few simple endpoints.
- NestJS has first-class REST support.
- The API is easy to test with standard tools.
- It remains accessible to clients written in any language.
- Conventional REST API design is a broadly transferable skill.
- Shared TypeScript types can already be placed in `packages/shared`.

tRPC becomes more attractive in a large TypeScript application with many
closely connected frontend and backend operations. Its type safety does not
replace runtime validation because all network input remains untrusted.

## Can this project scale, and can REST be migrated to tRPC later?

Yes. React, NestJS, Prisma, PostgreSQL, and REST can all support large
applications. REST is not inherently less scalable than tRPC. tRPC mainly
improves developer type safety; it does not automatically handle more traffic.

The current infrastructure is the first scaling limitation because everything
runs on one Pi. A larger deployment may need:

- A managed PostgreSQL database.
- Multiple API replicas behind a load balancer.
- A CDN-hosted frontend.
- Redis for shared caching or distributed rate limiting.
- External object storage.
- External monitoring, backups, and automated recovery.

A REST-to-tRPC migration can be gradual. tRPC procedures can be added beside
the existing REST controllers, and both can call the same NestJS services and
Prisma layer. Frontend calls can then be migrated one operation at a time.
REST endpoints may remain for health checks, webhooks, public integrations, or
non-TypeScript clients.

Changing from REST to tRPC would not solve hosting or traffic-capacity problems.
Those require infrastructure changes.

## What is a frontend CDN?

CDN stands for **Content Delivery Network**. It stores copies of compiled
frontend files—HTML, CSS, JavaScript, and images—on servers distributed around
the world. Visitors receive those files from a nearby server instead of the Pi.

Examples include:

- Cloudflare Pages
- Vercel
- Netlify
- AWS CloudFront with S3
- GitHub Pages for simpler static sites

The React frontend is well suited to CDN hosting. It would load faster, tolerate
traffic spikes better, and remain visible if the Pi went offline. Features that
call the Pi-hosted API, such as the contact form, would still fail during a Pi
outage.

## What is a VPS?

VPS stands for **Virtual Private Server**. It is a virtual Linux machine rented
from a hosting provider and run in a data center. It provides CPU, memory,
storage, a public IP address, and administrative access.

Examples include Hetzner Cloud, DigitalOcean, Linode, AWS Lightsail, and Vultr.
The existing Docker Compose stack could run on a VPS with relatively few
changes.

A VPS is generally more reliable than a home-hosted Pi, but a single VPS is
still one machine and therefore still a possible single point of failure.

## What is a cloud platform?

A cloud platform offers managed infrastructure and services rather than only a
single virtual machine.

Examples include AWS, Google Cloud, Microsoft Azure, Fly.io, Render, Railway,
and Cloudflare. A cloud-based version of this application might use:

```text
Cloudflare Pages → frontend
Render or Fly.io → API
Neon or Supabase → PostgreSQL
Cloudflare R2    → uploaded files
```

The providers can handle server provisioning, application restarts, HTTPS,
scaling, database backups, load balancing, and hardware replacement. The
trade-offs are potentially greater cost, provider-specific configuration, and
less direct control.
