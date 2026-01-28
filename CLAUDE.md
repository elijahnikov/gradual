# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Gradual is a feature flag management platform built as a Turborepo monorepo. It includes a web dashboard, mobile app, and marketing site sharing common packages for API, database, authentication, and UI components.

## Commands

### Development
```bash
bun dev                 # Start all apps in dev mode (watch mode)
bun build               # Build all packages
bun typecheck           # Type check all packages
```

### Database
```bash
bun db:push             # Push Drizzle schema to database
bun db:studio           # Open Drizzle Studio GUI
bun auth:generate       # Generate Better Auth schema to packages/db/src/auth-schema.ts
```

### Code Quality
```bash
bun check               # Run Ultracite code quality checks (Biome)
bun fix                 # Auto-fix code quality issues
```

### UI Components
```bash
bun ui-add              # Add shadcn components interactively
```

### Individual Apps
```bash
# Dashboard (apps/dashboard) - Tanstack Start + Vite
cd apps/dashboard && bun dev

# Expo (apps/expo)
cd apps/expo && bun dev           # Start Expo
cd apps/expo && bun dev:ios       # Start with iOS simulator
cd apps/expo && bun dev:android   # Start with Android emulator

# Marketing (apps/marketing) - Astro
cd apps/marketing && bun dev
```

## Architecture

### Monorepo Structure

**Apps:**
- `apps/dashboard` - Main SPA dashboard (Tanstack Start, React 19, Vite, tRPC)
- `apps/expo` - Mobile app (Expo SDK 54, React Native 0.81, NativeWind)
- `apps/marketing` - Marketing website (Astro 5)

**Packages:**
- `packages/api` - tRPC v11 router with Zod validation and SuperJSON
- `packages/db` - Drizzle ORM with PostgreSQL (Vercel Postgres driver)
- `packages/auth` - Better Auth with OAuth providers (GitHub, Google, Linear)
- `packages/ui` - React component library (shadcn/ui, Recharts, Lucide icons)
- `packages/cf-worker` - Cloudflare Workers package

**Tooling:**
- `tooling/typescript` - Shared TypeScript config
- `tooling/tailwind` - Shared Tailwind CSS v4 theme

### API Router Pattern

Each router in `packages/api/src/router/` follows this structure:
- `*.router.ts` - Route definitions
- `*.schemas.ts` - Zod validation schemas
- `*.services.ts` - Business logic and DB queries

Use `protectedOrganizationProcedure` for routes requiring organization-level access control.

### Key Technologies
- **Frontend:** React 19, Tanstack Start/Router/Query/Form, Tailwind CSS v4, tRPC v11
- **Mobile:** React Native 0.81, Expo SDK 54, NativeWind 5
- **Backend:** Drizzle ORM, PostgreSQL, Better Auth
- **Code Quality:** Biome via Ultracite, TypeScript strict mode

## Environment Variables

Required variables (see `.env.example`):
- `DATABASE_URL`, `DATABASE_HOST`, `DATABASE_USERNAME`, `DATABASE_PASSWORD`
- `AUTH_SECRET`
- OAuth: `GITHUB_CLIENT_ID/SECRET`, `GOOGLE_CLIENT_ID/SECRET`, `LINEAR_CLIENT_ID/SECRET`
- `POLAR_ACCESS_TOKEN`, `POLAR_SUCCESS_URL`

## Important Notes

- Package scope is `@gradual` - used across all internal packages
- The `api` package should only be a production dependency in server apps; client apps use it as a dev dependency for type safety
- Better Auth schema must be regenerated (`bun auth:generate`) after auth config changes
- Pre-commit hooks auto-run Ultracite formatting via Husky
