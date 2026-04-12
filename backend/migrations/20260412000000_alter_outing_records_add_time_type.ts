import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const hasOutingTime = await knex.schema.hasColumn('outing_records', 'outing_time');
  if (!hasOutingTime) {
    await knex.schema.alterTable('outing_records', (t) => {
      t.time('outing_time').nullable();
      t.string('outing_type', 20).nullable();
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('outing_records', (t) => {
    t.dropColumn('outing_time');
    t.dropColumn('outing_type');
  });
}
