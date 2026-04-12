import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // makeup_punch_rules: global config, always one row
  await knex.schema.createTableIfNotExists('makeup_punch_rules', (t) => {
    t.increments('id').primary();
    t.integer('deadline_working_days').notNullable().defaultTo(1);
    t.boolean('reason_required').notNullable().defaultTo(true);
    t.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });

  // Insert default rule row only if table was just created (empty)
  const count = await knex('makeup_punch_rules').count('id as c').first();
  if (!count || Number(count.c) === 0) {
    await knex('makeup_punch_rules').insert({
      deadline_working_days: 1,
      reason_required: true,
    });
  }

  // makeup_punch_requests: employee makeup punch requests
  await knex.schema.createTableIfNotExists('makeup_punch_requests', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('user_id').notNullable().references('id').inTable('users');
    t.date('work_date').notNullable();
    t.string('punch_type', 10).notNullable().checkIn(['clock_in', 'clock_out']);
    t.time('requested_time').notNullable();
    t.text('reason').nullable();
    t.string('status', 20).notNullable().defaultTo('pending').checkIn(['pending', 'approved', 'rejected', 'cancelled']);
    t.uuid('reviewed_by').nullable().references('id').inTable('users');
    t.text('review_comment').nullable();
    t.timestamp('reviewed_at', { useTz: true }).nullable();
    t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });

  await knex.schema.raw(`
    CREATE INDEX IF NOT EXISTS idx_makeup_punch_requests_user ON makeup_punch_requests(user_id);
    CREATE INDEX IF NOT EXISTS idx_makeup_punch_requests_status ON makeup_punch_requests(status) WHERE status = 'pending';
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('makeup_punch_requests');
  await knex.schema.dropTableIfExists('makeup_punch_rules');
}
