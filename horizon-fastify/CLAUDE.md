# Horizon Fastify Instructions

## Code Formatting Rules (Prettier)
When editing TypeScript/JavaScript files, use these formatting rules to match VSCode's auto-formatting:

- **Quotes**: Use double quotes (`"`) instead of single quotes
- **Semicolons**: No semicolons at end of statements
- **Trailing Commas**: Use trailing commas in multi-line objects/arrays
- **Arrow Parens**: Always include parentheses around arrow function parameters
- **Print Width**: Default (80 characters)
- **Tab Width**: 2 spaces
- **Indentation**: Use spaces, not tabs

### Example:
```typescript
// Correct formatting:
import { FastifyRequest, FastifyReply } from "fastify"

const myFunction = (param: string) => {
  const obj = {
    key: "value",
    anotherKey: "anotherValue",
  }
  return obj
}

// Incorrect:
import { FastifyRequest, FastifyReply } from 'fastify';

const myFunction = param => {
  const obj = {
    key: 'value',
    anotherKey: 'anotherValue'
  };
  return obj;
}
```

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