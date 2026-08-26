# Splitwise

Group expense splitting app — Next.js frontend, Spring Boot backend, PostgreSQL.

## Structure

```
splitwise-app/
├── backend/     Spring Boot API (Java 17, Spring Security + JWT, JPA, PostgreSQL)
└── frontend/    Next.js app (App Router, TypeScript)
```

Each half is a standalone project with its own dependency manifest (`pom.xml` /
`package.json`) — this is the standard layout for a Next.js + Spring Boot repo,
so each can be run, built, and deployed independently.

## Backend

```bash
cd backend
# set DB_USERNAME / DB_PASSWORD / JWT_SECRET as env vars, or edit application.yml directly
mvn spring-boot:run
```

Runs on `http://localhost:8080`. See `src/main/java/com/splitwise/` for the
package layout (config, controller, dto, entity, exception, repository,
security, service).

## Frontend

```bash
cd frontend
npm install
npm run dev
```

Runs on `http://localhost:3000`. Set `NEXT_PUBLIC_API_BASE_URL` in a `.env.local`
file if the backend isn't on `localhost:8080`.

## Database

PostgreSQL. Create a local DB named `splitwise`, or point `application.yml`
at a hosted instance (Supabase/Neon/Railway all offer free Postgres tiers).
