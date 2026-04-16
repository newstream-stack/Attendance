import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.table('leave_types', (table) => {
    table.boolean('requires_attachment').notNullable().defaultTo(false);
  });
  await knex.schema.table('leave_requests', (table) => {
    table.text('attachment_path').nullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.table('leave_requests', (table) => {
    table.dropColumn('attachment_path');
  });
  await knex.schema.table('leave_types', (table) => {
    table.dropColumn('requires_attachment');
  });
}
