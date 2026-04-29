import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('system_settings', (t) => {
    t.specificType('notification_cc_emails', 'text[]').notNullable().defaultTo('{}');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('system_settings', (t) => {
    t.dropColumn('notification_cc_emails');
  });
}
