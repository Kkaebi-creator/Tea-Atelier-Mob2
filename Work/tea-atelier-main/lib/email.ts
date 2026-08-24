import { Resend } from "resend";

let resend: Resend | null = null;

function getResend() {
  if (!process.env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY not set - email sending will fail");
    return null;
  }
  if (!resend) {
    resend = new Resend(process.env.RESEND_API_KEY);
  }
  return resend;
}

export async function sendVerificationEmail(to: string, token: string) {
  const client = getResend();
  if (!client) return;

  const verifyUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/verify-email?token=${token}`;

  await client.emails.send({
    from: `Tea Atelier <${process.env.EMAIL_FROM}>`,
    to,
    subject: "Verify your Tea Atelier account",
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2>Welcome to Tea Atelier!</h2>
        <p>One final step, please confirm your email address to finish setting up your account.</p>
        <a href="${verifyUrl}" style="display: inline-block; background: #8a9a7e; color: #fff; padding: 12px 24px; text-decoration: none; margin-top: 16px;">
          Verify Email
        </a>
        <p style="color: #888; font-size: 12px; margin-top: 24px;">
          This link expires in 24 hours. If you didn't create this account, you can ignore this email.
        </p>
      </div>
    `,
  });
}

export async function sendPasswordResetEmail(to: string, token: string) {
  const client = getResend();
  if (!client) return;

  const resetUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/reset-password?token=${token}`;

  await client.emails.send({
    from: `Tea Atelier <${process.env.EMAIL_FROM}>`,
    to,
    subject: "Reset your Tea Atelier password",
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2>Reset your password</h2>
        <p>We received a request to reset your password. Click below to choose a new one.</p>
        <a href="${resetUrl}" style="display: inline-block; background: #8a9a7e; color: #fff; padding: 12px 24px; text-decoration: none; margin-top: 16px;">
          Reset Password
        </a>
        <p style="color: #888; font-size: 12px; margin-top: 24px;">
          This link expires in 1 hour. If you didn't request this, you can safely ignore this email.
        </p>
      </div>
    `,
  });
}

export async function sendWelcomeEmail(to: string, firstName: string) {
  const client = getResend();
  if (!client) return;

  await client.emails.send({
    from: `Tea Atelier <${process.env.EMAIL_FROM}>`,
    to,
    subject: "Welcome to Tea Atelier!",
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2>Welcome to Tea Atelier, ${firstName}!</h2>
        <p>Your account is all set up and ready to go. Explore our seasonal blends and start your tea journey with us.</p>
        <a href="${process.env.NEXT_PUBLIC_SITE_URL}" style="display: inline-block; background: #8a9a7e; color: #fff; padding: 12px 24px; text-decoration: none; margin-top: 16px;">
          Visit the Shop
        </a>
      </div>
    `,
  });
}