# Learning Module Migrations

This directory contains database migration scripts for the learning module.

## Migration Files

### 2025-10-23-create-learning-schema.sql
Initial schema creation for the spaced-repetition learning platform.

**Creates:**
- Schema: `learning`
- Enum: `learning.difficulty` (beginner, intermediate, advanced, expert)
- Tables:
  - `learning.categories` - Tree structure for organizing problems
  - `learning.problems` - LLM-generated problems
  - `learning.submissions` - User submission attempts
  - `learning.ai_evaluations` - AI evaluation results
  - `learning.spaced_repetition_schedules` - SM-2 algorithm schedules

## How to Apply Migrations

### Manual Application
```bash
# Apply to local database
PGPASSWORD=singularity2030 psql -h 127.0.0.1 -p 20432 -U horizon -d horizon -f 2025-10-23-create-learning-schema.sql
```

### Using Drizzle Kit
```bash
# Generate new migration from schema changes
npx drizzle-kit generate

# Push schema directly to database (development only)
npx drizzle-kit push

# Apply migrations
npx drizzle-kit migrate
```

## Rollback

To rollback the schema:
```sql
DROP SCHEMA learning CASCADE;
```

## Notes

- All tables use UUID primary keys
- Timestamps use `TIMESTAMP WITHOUT TIME ZONE`
- Foreign key constraints follow specific cascade rules:
  - Categories parent: SET NULL on delete
  - Problems category: RESTRICT on delete
  - Submissions/Evaluations/Schedules: CASCADE on delete
- Indexes are created for all foreign keys and common query patterns
- The SM-2 algorithm uses `ease_factor` (1.3-2.5), `interval`, and `repetitions`