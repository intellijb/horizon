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

## Architecture

### Modular Monolithic Structure
```
src/
├── app.ts                 # Application bootstrap
├── server.ts              # Server entry point
├── config.ts              # Configuration management
├── plugins/               # Fastify plugins (thin wrappers)
│   ├── drizzle.ts        # Database ORM
│   ├── swagger.ts        # API documentation
│   └── security.ts       # Auth, CORS, helmet
├── modules/              # Domain modules
│   ├── entries/          # Entry management domain
│   │   ├── routes.ts     # HTTP endpoints
│   │   ├── service.ts    # Business logic
│   │   ├── repository.ts # Data access layer
│   │   └── schemas.ts    # Zod validation schemas
│   ├── attachments/      # Attachment domain
│   │   └── [same structure as entries]
│   └── health/           # Health checks
│       └── routes.ts
└── db/                   # Database schemas
    └── schema/
        ├── entries.schema.ts
        └── auth.schema.ts
```

### Layered Architecture Pattern

**Request Flow**: Route → Service → Repository → Database

1. **Routes Layer** (`routes.ts`)
   - HTTP endpoint definitions
   - Request/response validation via Zod schemas
   - Delegates to service layer
   - No business logic

2. **Service Layer** (`service.ts`)
   - Business logic and rules
   - Data validation
   - Error handling
   - Framework agnostic

3. **Repository Layer** (`repository.ts`)
   - Database queries (Drizzle ORM)
   - Data transformation
   - Returns domain objects

4. **Schema Layer** (`schemas.ts`)
   - Zod schemas for validation
   - TypeScript type inference
   - Single source of truth for types

### Key Principles
- **Separation of Concerns**: Each layer has single responsibility
- **Dependency Direction**: Upper layers depend on lower, never reverse
- **Framework Independence**: Services don't know about HTTP/Fastify
- **Type Safety**: End-to-end type inference from Zod schemas

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

## Development
- `npm run dev` - Start dev server
- `npm run check` - TypeScript type checking
- `npm run db:migrate` - Run migrations
- `npm run db:seed` - Seed test data
- `npm run db:studio` - Open Drizzle Studio

## API Endpoints

### Entries
- `GET /entries` - List entries (paginated)
- `GET /entries/:id` - Get single entry
- `POST /entries` - Create entry
- `PATCH /entries/:id` - Update entry
- `DELETE /entries/:id` - Soft delete

### Attachments
- `GET /attachments` - List attachments
- `GET /attachments/:id` - Get attachment
- `POST /attachments` - Create attachment
- `DELETE /attachments/:id` - Delete attachment

### Health
- `GET /health` - System health check
- `GET /health/ping` - Simple ping

### Documentation
- `/docs` - Scalar API documentation
- `/docs/json` - OpenAPI specification

# important-instruction-reminders
Do what has been asked; nothing more, nothing less.
NEVER create files unless they're absolutely necessary for achieving your goal.
ALWAYS prefer editing an existing file to creating a new one.
NEVER proactively create documentation files (*.md) or README files. Only create documentation files if explicitly requested by the User.