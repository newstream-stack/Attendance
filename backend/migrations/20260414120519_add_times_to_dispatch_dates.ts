import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('dispatch_dates', (t) => {
    t.time('clock_in_time').nullable();   // 預定上班時間 HH:MM
    t.time('clock_out_time').nullable();  // 預定下班時間 HH:MM
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('dispatch_dates', (t) => {
    t.dropColumn('clock_in_time');
    t.dropColumn('clock_out_time');
  });
}
