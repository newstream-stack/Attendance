import nodemailer from 'nodemailer';
import { env } from '../config/env';

const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: false,
  auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
});

export async function sendWelcomeEmail(to: string, fullName: string, tempPassword: string): Promise<void> {
  await transporter.sendMail({
    from: env.SMTP_FROM,
    to,
    subject: '歡迎加入出缺勤系統',
    html: `
      <p>${fullName} 您好，</p>
      <p>管理員已為您建立帳號，請使用以下資訊登入系統並立即修改密碼：</p>
      <p><strong>Email：</strong>${to}</p>
      <p><strong>臨時密碼：</strong>${tempPassword}</p>
      <p><a href="${env.FRONTEND_URL}/login">點此登入系統</a></p>
    `,
  });
}

export async function sendPasswordResetEmail(to: string, token: string): Promise<void> {
  const resetUrl = `${env.FRONTEND_URL}/reset-password?token=${token}`;

  await transporter.sendMail({
    from: env.SMTP_FROM,
    to,
    subject: '密碼重設通知',
    html: `
      <p>您好，</p>
      <p>我們收到了您的密碼重設請求。請點擊以下連結重設密碼（連結將在 1 小時後失效）：</p>
      <p><a href="${resetUrl}">${resetUrl}</a></p>
      <p>若您未申請重設密碼，請忽略此郵件。</p>
    `,
  });
}
