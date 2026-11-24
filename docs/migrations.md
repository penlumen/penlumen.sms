# Database migrations

Migrations live in `apps/api/prisma/migrations` and run with
`bun run prisma:migrate` (`prisma migrate deploy`).

## The baseline (squashed on 2026-11-24)

The 33 migrations up to `20261120140000_oaa_reg_numbers` were squashed into
one, `0_baseline`: the whole schema as it stood, including the one thing
Prisma's schema can't describe, the partial unique index
`Calendar_one_active_per_branch` (one active term per branch). Later
migrations (`20261122173855_app_scores`, `20261124100000_subject_teacher`,
…) come after it as usual.

It was checked by building one database from the old migrations and one
from the baseline and comparing tables, columns, defaults, indexes,
constraints and enums: they match, apart from the internal names Postgres
gave the not-null constraints of `ResultAssessments` before that table was
renamed (no effect on anything).

### A new, empty database

Nothing special: `prisma migrate deploy` runs `0_baseline` and everything
after it.

### A database that already had the old migrations

Its `_prisma_migrations` table lists the 33 old migrations, which no longer
exist here. Tell it the baseline is already applied instead of running it
(that would fail: the tables exist). Once per database, with
`DATABASE_URL` set to **that** database:

```bash
# 1. Check it has every old migration and nothing newer is missing:
#    the last old one is 20261120140000_oaa_reg_numbers.
psql "$DATABASE_URL" -c "SELECT migration_name, finished_at FROM _prisma_migrations ORDER BY started_at;"

# 2. Back it up first.
pg_dump "$DATABASE_URL" > backup-before-baseline.sql

# 3. Forget the old migrations and mark the baseline applied (changes only
#    the _prisma_migrations bookkeeping table, not your data).
psql "$DATABASE_URL" -c "DELETE FROM _prisma_migrations WHERE migration_name < '20261121';"
bunx prisma migrate resolve --applied 0_baseline

# 4. Apply what's new since (app scores, subject teachers).
bunx prisma migrate deploy
bunx prisma migrate status
```

Step 3's `< '20261121'` matches exactly the 33 old migration names (all
dated up to 2026-11-20); check the list from step 1 before running it.

The local development database (`penlumen_sms`) has already been switched
this way.
