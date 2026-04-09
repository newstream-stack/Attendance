import dotenv from 'dotenv';

dotenv.config();

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  PORT: parseInt(process.env.PORT ?? '4000', 10),

  DATABASE_URL: requireEnv('DATABASE_URL'),

  JWT_SECRET: requireEnv('JWT_SECRET'),
  JWT_ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',

  SMTP_HOST: process.env.SMTP_HOST ?? 'mailhog',
  SMTP_PORT: parseInt(process.env.SMTP_PORT ?? '1025', 10),
  SMTP_USER: process.env.SMTP_USER ?? '',
  SMTP_PASS: process.env.SMTP_PASS ?? '',
  SMTP_FROM: process.env.SMTP_FROM ?? 'noreply@company.com',

  FRONTEND_URL: process.env.FRONTEND_URL ?? 'http://localhost:3000',

  isProduction: process.env.NODE_ENV === 'production',
  isDevelopment: process.env.NODE_ENV !== 'production',
};
