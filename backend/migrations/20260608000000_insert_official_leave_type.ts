import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex('leave_types').insert({
    code: 'official',
    name_zh: '公假',
    name_en: 'Official Leave',
    is_paid: true,
    requires_balance: false,
    requires_attachment: false,
    max_days_per_year: null,
    carry_over_days: 0,
    is_active: true,
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex('leave_types').where({ code: 'official' }).delete();
}
