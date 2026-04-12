import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('outing_records', (t) => {
    t.time('outing_time').nullable();              // 外出時間 HH:MM
    t.string('outing_type', 20).nullable();        // 項目：公出 / 出差
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('outing_records', (t) => {
    t.dropColumn('outing_time');
    t.dropColumn('outing_type');
  });
}
