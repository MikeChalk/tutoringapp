const twilioEnabled = !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN)

function log(phone: string, message: string) {
  console.log(`[SMS SKIPPED] To: ${phone} — ${message}`)
}

export async function sendInvoiceSMS(phone: string, name: string, amount: number, invoiceNumber: string) {
  if (!twilioEnabled) { log(phone, `Invoice ${invoiceNumber} for $${amount.toFixed(2)} is available.`); return }
  // TODO: Integrate Twilio SDK
}

export async function sendPaymentSMS(phone: string, name: string, amount: number) {
  if (!twilioEnabled) { log(phone, `Payment of $${amount.toFixed(2)} received. Thanks ${name}!`); return }
  // TODO: Integrate Twilio SDK
}

