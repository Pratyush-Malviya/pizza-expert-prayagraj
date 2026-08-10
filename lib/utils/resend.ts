/**
 * Resend Email Service Utility for Transactional & Retention Emails.
 * Uses HTTP Fetch API to interface with Resend REST API (https://api.resend.com/emails).
 */

interface SendEmailParams {
  to: string | string[]
  subject: string
  html: string
  from?: string
}

export async function sendEmail({
  to,
  subject,
  html,
  from = 'Pizza Expert <onboarding@resend.dev>',
}: SendEmailParams): Promise<{ success: boolean; data?: any; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY

  if (!apiKey || apiKey.startsWith('re_xxxx')) {
    console.warn('Resend API key missing or placeholder in .env.local. Email log:', { to, subject })
    return {
      success: true,
      data: { id: `mock-email-${Date.now()}`, note: 'Logged (set valid RESEND_API_KEY in Vercel to dispatch live emails)' },
    }
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from,
        to: Array.isArray(to) ? to : [to],
        subject,
        html,
      }),
    })

    const data = await res.json()

    if (!res.ok) {
      console.error('Resend API error:', data)
      return { success: false, error: data.message || 'Failed to send email via Resend' }
    }

    return { success: true, data }
  } catch (err: any) {
    console.error('Resend dispatch error:', err)
    return { success: false, error: err.message || 'Email dispatch failed' }
  }
}

/**
 * Send Transactional Order Confirmation Email
 */
export async function sendOrderConfirmationEmail(toEmail: string, orderData: {
  orderId: string
  customerName: string
  items: Array<{ name: string; quantity: number; unitPrice: number }>
  total: number
}) {
  const itemsHtml = orderData.items
    .map(i => `<tr><td style="padding:8px;border-bottom:1px solid #E7E0D8;">${i.name} x${i.quantity}</td><td style="padding:8px;border-bottom:1px solid #E7E0D8;text-align:right;">₹${(i.unitPrice * i.quantity).toFixed(2)}</td></tr>`)
    .join('')

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;background:#FBF9F5;color:#1C1917;">
      <div style="background:#B91C1C;color:#FFF;padding:20px;text-align:center;border-radius:10px 10px 0 0;">
        <h1 style="margin:0;font-size:24px;">🍕 Pizza Expert Prayagraj</h1>
        <p style="margin:5px 0 0 0;font-size:14px;">Order Confirmed! #${orderData.orderId}</p>
      </div>

      <div style="background:#FFF;padding:25px;border:1px solid #E7E0D8;border-radius:0 0 10px 10px;">
        <p>Hi <strong>${orderData.customerName}</strong>,</p>
        <p>Thank you for your order! Our kitchen in Allapur has accepted your order and started preparing your fresh wood-fired pizza.</p>

        <h3 style="color:#B91C1C;border-bottom:2px solid #B91C1C;padding-bottom:5px;">Order Summary</h3>
        <table style="width:100%;border-collapse:collapse;margin-bottom:15px;">
          ${itemsHtml}
          <tr>
            <td style="padding:10px;font-weight:bold;">Total Amount Paid:</td>
            <td style="padding:10px;font-weight:bold;text-align:right;color:#B91C1C;">₹${orderData.total.toFixed(2)}</td>
          </tr>
        </table>

        <p style="text-align:center;margin-top:25px;">
          <a href="https://pizza-kappa-nine.vercel.app/track?orderId=${orderData.orderId}" style="background:#B91C1C;color:#FFF;padding:12px 25px;text-decoration:none;border-radius:8px;font-weight:bold;display:inline-block;">Track Live Order Status</a>
        </p>
      </div>
    </div>
  `

  return sendEmail({
    to: toEmail,
    subject: `🍕 Order Confirmed #${orderData.orderId} - Pizza Expert Prayagraj`,
    html,
  })
}

/**
 * Send Abandoned Cart Recovery Discount Email
 */
export async function sendAbandonedCartRecoveryEmail(toEmail: string, itemsCount: number) {
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;background:#FBF9F5;color:#1C1917;">
      <div style="background:#B91C1C;color:#FFF;padding:20px;text-align:center;border-radius:10px 10px 0 0;">
        <h1 style="margin:0;font-size:24px;">🍕 Did You Forget Your Pizza?</h1>
      </div>

      <div style="background:#FFF;padding:25px;border:1px solid #E7E0D8;border-radius:0 0 10px 10px;text-align:center;">
        <p style="font-size:16px;">You left <strong>${itemsCount} delicious item(s)</strong> in your cart!</p>
        <p>Complete your order now and enjoy <strong>5% OFF</strong> with your exclusive code:</p>

        <div style="background:#FEF3C7;border:2px dashed #D97706;padding:15px;margin:20px 0;border-radius:8px;font-size:22px;font-weight:bold;color:#D97706;letter-spacing:2px;">
          COMEBACK5
        </div>

        <p>
          <a href="https://pizza-kappa-nine.vercel.app/checkout" style="background:#16A34A;color:#FFF;padding:14px 30px;text-decoration:none;border-radius:8px;font-weight:bold;display:inline-block;font-size:16px;">Complete My Order Now</a>
        </p>
      </div>
    </div>
  `

  return sendEmail({
    to: toEmail,
    subject: `🔥 Your hot pizza is waiting! Get 5% Off - Pizza Expert`,
    html,
  })
}

/**
 * Send Refund Processed Notification Email
 */
export async function sendRefundNotificationEmail(toEmail: string, refundData: {
  orderId: string
  customerName: string
  amount: number
  refundRef: string
}) {
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;background:#FBF9F5;color:#1C1917;">
      <div style="background:#DC2626;color:#FFF;padding:20px;text-align:center;border-radius:10px 10px 0 0;">
        <h1 style="margin:0;font-size:24px;">Order Cancelled & Refund Initiated</h1>
      </div>

      <div style="background:#FFF;padding:25px;border:1px solid #E7E0D8;border-radius:0 0 10px 10px;">
        <p>Hi <strong>${refundData.customerName}</strong>,</p>
        <p>Your order <strong>#${refundData.orderId}</strong> was cancelled. We have processed a full refund to your original payment method.</p>

        <div style="background:#FDFBF7;border:1px solid #E7E0D8;padding:15px;border-radius:8px;margin:15px 0;">
          <p style="margin:4px 0;"><strong>Refund Amount:</strong> ₹${refundData.amount.toFixed(2)}</p>
          <p style="margin:4px 0;"><strong>Refund Reference ID:</strong> ${refundData.refundRef}</p>
          <p style="margin:4px 0;"><strong>Timeline:</strong> 3–5 business days (UPI/Card reversal)</p>
        </div>

        <p style="font-size:12px;color:#78716C;">If you have any questions, feel free to contact our support on WhatsApp.</p>
      </div>
    </div>
  `

  return sendEmail({
    to: toEmail,
    subject: `Order #${refundData.orderId} Refund Initiated - Pizza Expert`,
    html,
  })
}
