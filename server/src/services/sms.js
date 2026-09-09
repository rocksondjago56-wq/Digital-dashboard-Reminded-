export const isSmsDeliveryConfigured = () => Boolean(
  process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM_NUMBER
);

export const isWhatsAppDeliveryConfigured = () => Boolean(
  process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_WHATSAPP_FROM
);

const toE164 = (value) => {
  const original = String(value || '').trim();
  const digits = original.replace(/\D/g, '');
  if (digits.startsWith('0') && digits.length === 10) return `+233${digits.slice(1)}`;
  if (digits.startsWith('233') && digits.length === 12) return `+${digits}`;
  if (original.startsWith('+')) return original;
  throw new Error('Use a valid Ghana mobile number, for example 0506471139 or +233506471139.');
};

export async function sendVerificationSMS({ to, name, code }) {
  if (!isSmsDeliveryConfigured()) {
    return { delivered: false, developmentCode: process.env.NODE_ENV === 'production' ? undefined : code };
  }

  const credentials = Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64');
  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`, {
    method: 'POST',
    headers: { Authorization: `Basic ${credentials}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      To: toE164(to),
      From: process.env.TWILIO_FROM_NUMBER,
      Body: `TTU Graphic Design Portal: ${name}, your phone verification code is ${code}. It expires in 15 minutes.`
    })
  });

  if (!response.ok) throw new Error(`SMS delivery failed: ${await response.text()}`);
  return { delivered: true };
}

export async function sendVerificationWhatsApp({ to, name, code }) {
  if (!isWhatsAppDeliveryConfigured()) throw new Error('WhatsApp verification is not configured.');

  const credentials = Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64');
  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`, {
    method: 'POST',
    headers: { Authorization: `Basic ${credentials}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      To: `whatsapp:${toE164(to)}`,
      From: process.env.TWILIO_WHATSAPP_FROM,
      Body: `TTU Graphic Design Portal: ${name}, your verification code is ${code}. It expires in 15 minutes.`
    })
  });

  if (!response.ok) throw new Error(`WhatsApp delivery failed: ${await response.text()}`);
  return { delivered: true };
}
