import type { Knex } from 'knex';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// __filename ends with .js when running compiled production build
const isCompiled = __filename.endsWith('.js');

const config: Knex.Config = {
  client: 'pg',
  connection: process.env.DATABASE_URL,
  migrations: {
    directory: isCompiled
      ? path.resolve(__dirname, '../migrations')   // dist/config → dist/migrations
      : path.resolve(__dirname, '../../migrations'), // src/config → migrations
    extension: isCompiled ? 'js' : 'ts',
  },
};

export default config;
