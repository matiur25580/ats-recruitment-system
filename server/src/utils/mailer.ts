/*
 * LEARNING NOTE: Centralized SMTP delivery with explicit configuration checks and bounded retries.
 * Email is a non-blocking notification side effect; application state remains authoritative.
 */
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

type MailTransport = { sendMail: (options: Record<string, unknown>) => Promise<unknown> };
let injectedTransport: MailTransport | null = null;
let cachedTransport: MailTransport | null = null;

const getTransport = (): MailTransport | null => {
  if (injectedTransport) return injectedTransport;
  if (cachedTransport) return cachedTransport;

  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;
  const host = process.env.SMTP_HOST;
  if (!user || !pass) return null;

  if (host) {
    const port = Number(process.env.SMTP_PORT || 587);
    cachedTransport = nodemailer.createTransport({
      host,
      port,
      secure: process.env.SMTP_SECURE === 'true' || port === 465,
      auth: { user, pass },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
    }) as unknown as MailTransport;
  } else {
    // Backward-compatible Gmail configuration; production deployments can use any SMTP provider.
    cachedTransport = nodemailer.createTransport({
      service: 'gmail',
      auth: { user, pass },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
    }) as unknown as MailTransport;
  }
  return cachedTransport;
};

// A narrow injection seam makes delivery/retry behavior testable without live SMTP credentials.
export const configureMailerTransport = (transport: MailTransport | null): void => {
  injectedTransport = transport;
};

export const sendEmail = async (to: string, subject: string, text: string): Promise<boolean> => {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to) || !subject.trim() || subject.length > 200) {
    console.warn('Email skipped: invalid recipient or subject');
    return false;
  }

  const transport = getTransport();
  const from = process.env.EMAIL_FROM || process.env.EMAIL_USER;
  if (!transport || !from) {
    console.warn('Email skipped: SMTP credentials are not configured');
    return false;
  }

  const mailOptions = {
    from: `"HireFlow" <${from}>`,
    to,
    subject,
    text,
  };

  // Retry once for transient SMTP failures; never log recipient, message body, or credentials.
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      await transport.sendMail(mailOptions);
      return true;
    } catch (error) {
      console.error(`Email delivery attempt ${attempt} failed`, error instanceof Error ? error.message : 'Unknown SMTP error');
      if (attempt === 2) return false;
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
  }
  return false;
};
