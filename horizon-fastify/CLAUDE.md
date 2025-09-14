# Horizon Fastify Instructions

## Architecture

### Clean Architecture Structure
```
src/
├── app.ts                    # Application bootstrap
├── server.ts                 # Server entry point
├── config/                   # Configuration
├── plugins/                  # Fastify plugins
├── routes/                   # HTTP route handlers
│   ├── auth.route.ts
│   ├── auth.types.ts        # Route-specific types
│   ├── entries.route.ts
│   └── attachments.route.ts
└── modules/
    ├── platform/            # Platform services
    │   ├── database/        # Database (migrations, schema)
    │   ├── logging/         # Logging system
    │   └── security/        # Security utilities
    └── features/            # Business features
        ├── auth/            # Authentication module
        │   ├── application/ # Use cases
        │   ├── business/    # Business logic
        │   ├── constants/   # Module constants
        │   ├── domain/      # Entities & ports
        │   └── extensions/  # Implementations & schema
        └── entries/         # Entries & attachments module
            └── [same structure]
```

### Key Principles
- **Clean Architecture**: Features follow a/b/c/d/e pattern (application, business, constants, domain, extensions)
- **Schema Location**: Database schemas live within feature modules (extensions/schema/)
- **Type Safety**: Zod for validation, TypeScript for static typing
- **Separation**: Routes handle HTTP, modules contain business logic

## Formatting Rules
- Double quotes (`"`) for strings
- No semicolons
- Trailing commas in multi-line structures
- 2 spaces indentation
- Parentheses around arrow function parameters

## Development Commands
```bash
npm run dev         # Start dev server
npm run check       # TypeScript check
npm run db:migrate  # Run migrations
npm run db:seed     # Seed database
npm run db:studio   # Drizzle Studio
```

## Import Aliases
- `@/*` → src/
- `@modules/*` → src/modules/
- `@config` → src/config

# Important Reminders
- Do only what's asked, nothing more
- Prefer editing existing files over creating new ones
- Don't create documentation unless explicitly requested