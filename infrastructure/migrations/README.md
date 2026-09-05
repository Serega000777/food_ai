# Migrations

Generated from `apps/api/src/db/schema/**` — never hand-edited.

```bash
pnpm db:generate   # writes a new migration from schema changes
pnpm db:migrate    # applies pending migrations to DATABASE_URL
```

No schema exists yet (Phase 0). The first migration lands in Phase 1 with
`User` / `UserProfile` / `Goal`.
