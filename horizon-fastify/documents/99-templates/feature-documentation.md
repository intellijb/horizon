---
title: {{title}}
type: feature
tags: [feature, {{module}}]
created: {{date}}
updated: {{date}}
author: {{author}}
status: draft
---

# {{title}}

## Overview
Brief description of the feature and its purpose.

## Architecture
### Module Structure
```
src/modules/features/{{module}}/
├── application/
├── business/
├── constants/
├── domain/
└── extensions/
```

### Key Components
- **Controllers**:
- **Use Cases**:
- **Domain Models**:
- **Repository**:

## API Endpoints
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET    | `/api/{{module}}` | | Yes/No |
| POST   | `/api/{{module}}` | | Yes/No |

## Database Schema
### Tables
- `{{schema}}.{{table}}`

### Relationships
-

## Business Rules
1.
2.

## Security Considerations
-

## Testing
### Unit Tests
- Location: `src/modules/features/{{module}}/__tests__/`
- Coverage:

### E2E Tests
- Location: `src/tests/e2e/{{module}}.e2e.test.ts`

## Configuration
### Environment Variables
```env
{{MODULE}}_ENABLED=true
```

## Dependencies
### Internal
-

### External
-

## Future Improvements
- [ ]

## Related Documents
- [[docs/03-api/{{module}}-api|API Documentation]]
- [[docs/06-testing/{{module}}-tests|Test Documentation]]

---
*Last reviewed: {{date}}*