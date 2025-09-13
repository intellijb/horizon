# Horizon Fastify Refactoring Plan

## Executive Summary
Refactoring Fastify backend from current structure to modular monolithic architecture following layered/clean principles. Target: high cohesion, low coupling, improved DX, microservice-ready.

## Current State Analysis

### Existing Structure
```
src/
├── app.ts           # Main app registration
├── config.ts        # Configuration
├── server.ts        # Server entry
├── db/              # Database schemas (Drizzle)
│   ├── schema/
│   │   ├── auth.schema.ts
│   │   ├── entries.schema.ts
│   │   └── relations.ts
│   └── migrations/
├── modules/         # Mixed concerns (connection, logging, utils)
├── plugins/         # Fastify plugins (good base)
├── routes/          # Basic routes (health, test)
└── graphql/         # GraphQL setup

```

### Identified Domains
- **entries**: Core content management (entries table)
- **attachments**: File attachments for entries
- **auth**: Authentication & authorization (future)
- **health**: System health monitoring

## Target Architecture

### New Structure
```
src/
├── app.ts                      # Clean app bootstrap
├── server.ts                   # Server entry point
├── config/                     # Centralized config
│   └── index.ts
├── plugins/                    # Fastify plugins (thin wrappers)
│   ├── drizzle.ts             # DB connection
│   ├── swagger.ts             # OpenAPI docs
│   ├── security.ts            # Auth/security hooks
│   └── monitoring.ts          # Health/metrics
├── modules/                    # Domain modules
│   ├── entries/
│   │   ├── routes.ts          # HTTP layer
│   │   ├── service.ts         # Business logic
│   │   ├── repository.ts     # Data access
│   │   ├── schemas.ts         # Zod schemas
│   │   └── __tests__/
│   ├── attachments/
│   │   └── [same structure]
│   └── health/
│       └── [same structure]
├── shared/                     # Cross-cutting concerns
│   ├── errors/
│   ├── types/
│   └── utils/
└── db/                        # Database (unchanged)
    ├── schema/
    └── migrations/
```

## Migration Strategy

### Phase 1: Foundation (Low Risk)
1. **Create plugin wrappers**
   - Move existing plugins to thin Fastify wrappers
   - Standardize plugin interfaces
   - Add @fastify/type-provider-zod

2. **Setup shared utilities**
   - Error handling patterns
   - Common types
   - Validation utilities

### Phase 2: Module Implementation (Medium Risk)
3. **Entries module**
   - Extract business logic from routes
   - Implement repository pattern with Drizzle
   - Define Zod schemas for validation
   - Add service layer

4. **Attachments module**
   - Similar structure to entries
   - Maintain relationship integrity

5. **Health module**
   - Consolidate health checks
   - Add metrics collection

### Phase 3: Integration (Low Risk)
6. **Update app.ts**
   - Register modules with prefixes
   - Configure plugin ordering
   - Setup error handlers

7. **Testing & Documentation**
   - Add integration tests
   - Generate OpenAPI docs
   - Verify type safety

## Risk Assessment

### Technical Risks
- **Database migrations**: None - schema remains unchanged
- **Breaking changes**: Minimal - API endpoints preserved
- **Type safety**: Improved with Zod schemas
- **Performance**: Neutral to positive impact

### Mitigation Strategies
- Feature branches for each module
- Preserve existing API contracts
- Incremental migration (module by module)
- Comprehensive testing at each phase

## Rollback Plan
1. Git revert to previous commit
2. Mapping.json allows automated rollback
3. Feature flags for gradual rollout
4. Parallel endpoints during transition

## Success Criteria
- [ ] TypeScript compilation: `tsc --noEmit` passes
- [ ] All existing tests pass
- [ ] OpenAPI documentation generates
- [ ] No performance regression
- [ ] Module boundaries enforced
- [ ] Zero runtime errors in production

## Implementation Timeline
- **Day 1**: Foundation setup, plugins, shared utilities
- **Day 2**: Entries module migration
- **Day 3**: Attachments & health modules
- **Day 4**: Integration, testing, documentation
- **Day 5**: Performance validation, deployment prep

## Long-term Benefits
1. **Scalability**: Easy to extract modules to microservices
2. **Testability**: Clear boundaries enable unit testing
3. **Maintainability**: Single responsibility per module
4. **Documentation**: Auto-generated from schemas
5. **Type Safety**: End-to-end type inference
6. **Team Productivity**: Clear structure reduces onboarding time