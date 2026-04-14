import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('users', (t) => {
    t.boolean('is_special_dispatch').notNullable().defaultTo(false);
  });

  await knex.schema.createTable('dispatch_dates', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.date('work_date').notNullable();
    t.text('note').nullable();
    t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.unique(['user_id', 'work_date']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('dispatch_dates');
  await knex.schema.alterTable('users', (t) => {
    t.dropColumn('is_special_dispatch');
  });
}
