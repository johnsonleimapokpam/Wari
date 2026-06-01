# Models

Phase 1 does not use an ORM model layer.

The data model is represented by:

- PostgreSQL tables in `sql/001_initial_schema.sql`
- repository mappers that convert database rows into API-safe objects

This keeps the architecture lightweight while still preserving a clean domain boundary.
