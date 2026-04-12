import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('leave_requests', (t) => {
    t.string('proxy_status', 20).nullable();   // pending | approved | rejected
    t.text('proxy_comment').nullable();
    t.timestamp('proxy_acted_at', { useTz: true }).nullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('leave_requests', (t) => {
    t.dropColumn('proxy_status');
    t.dropColumn('proxy_comment');
    t.dropColumn('proxy_acted_at');
  });
}
