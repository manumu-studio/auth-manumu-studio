// scripts/resend-test.ts
import 'dotenv/config';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY!);

(async () => {
  const { data, error } = await resend.emails.send({
    from: process.env.RESEND_FROM!,
    to: ['youraddress@provider.com'],
    subject: 'Resend test',
    text: 'Hello from a standalone test.',
  });
  console.log({ data, error });
})();