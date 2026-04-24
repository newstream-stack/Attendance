import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('leave_balances', (t) => {
    t.decimal('statutory_days_override', 5, 2).nullable().defaultTo(null);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('leave_balances', (t) => {
    t.dropColumn('statutory_days_override');
  });
}
