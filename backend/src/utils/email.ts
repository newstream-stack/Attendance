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

export async function sendProxyRequestEmail(
  to: string, proxyName: string, applicantName: string, leaveTypeName: string, startDate: string, endDate: string,
): Promise<void> {
  const url = `${env.FRONTEND_URL}/leave/proxy-review`;
  await transporter.sendMail({
    from: env.SMTP_FROM,
    to,
    subject: `【代理人確認】${applicantName} 的請假申請`,
    html: `
      <p>${proxyName} 您好，</p>
      <p>${applicantName} 提交了一份請假申請，並指定您為代理人，請進入系統確認您是否同意代理：</p>
      <ul>
        <li><strong>假別：</strong>${leaveTypeName}</li>
        <li><strong>期間：</strong>${startDate} ～ ${endDate}</li>
      </ul>
      <p><a href="${url}">點此進入系統確認</a></p>
      <p>若您不同意代理，請假申請將不會生效。</p>
    `,
  });
}

export async function sendProxyRejectionEmail(
  to: string, applicantName: string, proxyName: string,
): Promise<void> {
  await transporter.sendMail({
    from: env.SMTP_FROM,
    to,
    subject: '您的請假申請已被代理人拒絕',
    html: `
      <p>${applicantName} 您好，</p>
      <p>您的請假申請已被代理人 <strong>${proxyName}</strong> 拒絕，因此請假申請不會生效。</p>
      <p>如有疑問，請聯繫代理人或重新提交申請。</p>
      <p><a href="${env.FRONTEND_URL}/leave/history">查看我的假期申請</a></p>
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
