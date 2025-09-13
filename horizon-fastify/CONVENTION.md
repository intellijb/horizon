# Conventions

## Object Passing
**Rule**: Internal spread OK, external calls explicit

```typescript
// ✅ Internal: spreading OK
const config = { ...base, ...override };

// ✅ External: list properties
new Pool({
  connectionString: config.connectionString,
  max: config.max
});

// ❌ External: no spreading
new Pool(config);
```

**Why**: Debugging clarity - see exact data passed to third-party APIs without console.log