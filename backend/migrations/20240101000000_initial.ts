import type { Knex } from 'knex';

// Initial migration placeholder.
// The base schema is applied via db/init/001_schema.sql (docker-entrypoint-initdb.d).
// This migration file records the initial state so future schema changes
// can be managed via `knex migrate:make`.

export async function up(_knex: Knex): Promise<void> {
  // Schema already applied via 001_schema.sql seed
}

export async function down(_knex: Knex): Promise<void> {
  // No rollback for initial schema
}
