# Horizon Fastify Instructions

## Module Architecture

### Import Aliases
- `@/*` - src/ files
- `@modules/*` - Business logic modules  
- `@config` - Config (src/config/index)
- `@db/*` - Database schemas

### Type Organization
Colocate types with modules:
```typescript
// module/types.ts - Define types
// module/index.ts - Export with implementation
```

### Framework Agnostic
`@modules/*` are Fastify-independent, reusable business logic.
Plugins are thin Fastify wrappers around modules.

## Conventions
Follow CONVENTION.md in this directory. Key rule: Internal spread OK, external calls explicit properties.

## Development
- `npm run dev` - Start dev server
- `npm run db:migrate` - Run migrations
- `npm run db:seed` - Seed test data
- `npm run db:studio` - Open Drizzle Studio