export async function sendEmailNotification(to: string, subject: string, body: string) {
  console.log("=========================================");
  console.log(`[MOCK EMAIL SENT]`);
  console.log(`To: ${to}`);
  console.log(`Subject: ${subject}`);
  console.log(`Content:\n${body}`);
  console.log("=========================================");
  return true;
}

export async function sendWhatsAppNotification(to: string, message: string) {
  console.log("=========================================");
  console.log(`[MOCK WHATSAPP SENT]`);
  console.log(`To: ${to}`);
  console.log(`Message: ${message}`);
  console.log("=========================================");
  return true;
}
