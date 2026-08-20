import { NextRequest, NextResponse } from 'next/server'
import { sendEmail } from '@/lib/utils/resend'
import { SAMPLE_TEMPLATE_VALUES } from '@/lib/constants/defaultEmailTemplates'
import type { EmailTemplate } from '@/types/emailTemplate'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { template, targetEmail, businessName, logoUrl }: {
      template: EmailTemplate
      targetEmail: string
      businessName?: string
      logoUrl?: string
    } = body

    if (!template || !targetEmail) {
      return NextResponse.json(
        { error: 'Template and target email are required' },
        { status: 400 }
      )
    }

    // Replace variables in subject, heading, subheading, bodyText, buttonUrl, footerNote
    const replaceVars = (text: string) => {
      let result = text || ''
      const values = {
        ...SAMPLE_TEMPLATE_VALUES,
        '{{businessName}}': businessName || 'Pizza Expert',
      }
      Object.entries(values).forEach(([key, val]) => {
        result = result.replaceAll(key, val)
      })
      return result
    }

    const renderedSubject = `[TEST] ${replaceVars(template.subject)}`
    const renderedHeading = replaceVars(template.heading)
    const renderedSubheading = replaceVars(template.subheading)
    const renderedBody = replaceVars(template.bodyText)
    const renderedButtonText = replaceVars(template.buttonText)
    const renderedButtonUrl = replaceVars(template.buttonUrl)
    const renderedFooter = replaceVars(template.footerNote)
    const bannerColor = template.bannerColor || '#B91C1C'

    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #FBF9F5; padding: 30px 15px; margin: 0;">
        <div style="max-width: 580px; margin: 0 auto; background: #FFFFFF; border-radius: 16px; overflow: hidden; border: 1px solid #E7E0D8; box-shadow: 0 4px 20px rgba(0,0,0,0.06);">
          
          <!-- Brand Header -->
          <div style="background-color: ${bannerColor}; padding: 24px 20px; text-align: center; color: #FFFFFF;">
            ${
              logoUrl
                ? `<img src="${logoUrl}" alt="${businessName || 'Pizza Expert'}" style="max-height: 48px; margin-bottom: 8px;" />`
                : `<h1 style="margin: 0; font-size: 22px; font-weight: 900; letter-spacing: 1px; color: #FFFFFF;">${(businessName || 'PIZZA EXPERT').toUpperCase()}</h1>`
            }
            <p style="margin: 4px 0 0 0; font-size: 13px; font-weight: bold; opacity: 0.95; color: #FFFFFF;">
              ${renderedSubheading}
            </p>
          </div>

          <!-- Body Container -->
          <div style="padding: 30px 25px; color: #1C1917; line-height: 1.6;">
            <h2 style="font-size: 20px; font-weight: 800; color: #1C1917; margin-top: 0; margin-bottom: 12px;">
              ${renderedHeading}
            </h2>

            <p style="font-size: 14px; color: #44403C; margin-bottom: 20px; white-space: pre-line;">
              ${renderedBody}
            </p>

            <!-- Sample Order Item Table if variable present -->
            ${
              template.variables.includes('{{itemsTable}}')
                ? `
                <div style="background: #FBF9F5; border: 1px solid #E7E0D8; border-radius: 12px; padding: 16px; margin: 20px 0;">
                  <h3 style="margin: 0 0 10px 0; font-size: 12px; font-weight: bold; text-transform: uppercase; color: #78716C; letter-spacing: 0.5px;">Sample Order Summary</h3>
                  <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                    <tr>
                      <td style="padding: 6px 0; border-bottom: 1px dashed #E7E0D8; color: #1C1917;">1x Farmhouse Supreme (Medium)</td>
                      <td style="padding: 6px 0; border-bottom: 1px dashed #E7E0D8; text-align: right; font-weight: bold; color: #1C1917;">₹499.00</td>
                    </tr>
                    <tr>
                      <td style="padding: 6px 0; border-bottom: 1px dashed #E7E0D8; color: #1C1917;">1x Stuffed Garlic Bread</td>
                      <td style="padding: 6px 0; border-bottom: 1px dashed #E7E0D8; text-align: right; font-weight: bold; color: #1C1917;">₹150.00</td>
                    </tr>
                    <tr>
                      <td style="padding: 10px 0 0 0; font-weight: bold; color: #1C1917; font-size: 14px;">Total Bill:</td>
                      <td style="padding: 10px 0 0 0; text-align: right; font-weight: 900; color: ${bannerColor}; font-size: 16px;">₹649.00</td>
                    </tr>
                  </table>
                </div>
              `
                : ''
            }

            <!-- CTA Button -->
            ${
              renderedButtonText
                ? `
                <div style="text-align: center; margin: 28px 0 16px 0;">
                  <a href="${renderedButtonUrl}" target="_blank" style="background-color: ${bannerColor}; color: #FFFFFF; padding: 13px 28px; text-decoration: none; border-radius: 10px; font-weight: 800; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; display: inline-block; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
                    ${renderedButtonText} →
                  </a>
                </div>
              `
                : ''
            }

            <p style="font-size: 12px; color: #78716C; text-align: center; margin-top: 20px; border-top: 1px solid #E7E0D8; padding-top: 15px;">
              ${renderedFooter}
            </p>
          </div>

          <!-- Footer Bar -->
          <div style="background-color: #F5F0E6; padding: 14px; text-align: center; font-size: 11px; color: #78716C; border-top: 1px solid #E7E0D8;">
            © ${new Date().getFullYear()} ${businessName || 'Pizza Expert Prayagraj'}. All rights reserved.<br/>
            Wood-Fired Pizzeria • Allapur, Prayagraj, UP 211006
          </div>
        </div>
      </div>
    `

    const res = await sendEmail({
      to: targetEmail,
      subject: renderedSubject,
      html,
    })

    if (!res.success) {
      return NextResponse.json(
        { error: res.error || 'Failed to dispatch email' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `Test email dispatched to ${targetEmail}`,
      data: res.data,
    })
  } catch (err: any) {
    console.error('Test email route error:', err)
    return NextResponse.json(
      { error: err.message || 'Internal error dispatching test email' },
      { status: 500 }
    )
  }
}
