import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTableIfNotExists('system_settings', (t) => {
    t.integer('id').primary().defaultTo(1);
    t.time('work_start_time').notNullable().defaultTo('09:00');
    t.time('work_end_time').notNullable().defaultTo('18:00');
    t.integer('late_tolerance_mins').notNullable().defaultTo(0);
    t.integer('hours_per_day').notNullable().defaultTo(8);
    t.integer('base_bonus_days').notNullable().defaultTo(0);
    t.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now());
  });

  const existing = await knex('system_settings').where({ id: 1 }).first();
  if (!existing) {
    await knex('system_settings').insert({
      id: 1,
      work_start_time: '09:00',
      work_end_time: '18:00',
      late_tolerance_mins: 0,
      hours_per_day: 8,
      base_bonus_days: 0,
    });
  }

  const hasIsLate = await knex.schema.hasColumn('attendance_records', 'is_late');
  if (!hasIsLate) {
    await knex.schema.alterTable('attendance_records', (t) => {
      t.boolean('is_late').notNullable().defaultTo(false);
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('attendance_records', (t) => {
    t.dropColumn('is_late');
  });
  await knex.schema.dropTable('system_settings');
}
