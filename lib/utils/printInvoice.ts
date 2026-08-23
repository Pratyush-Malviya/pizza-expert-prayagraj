import { toast } from 'sonner'

export interface PrintableOrder {
  id: string
  customer: string
  phone: string
  email?: string
  address: string
  pincode?: string
  notes?: string
  items_summary?: string
  items_detail?: Array<{
    id?: string
    product_name: string
    quantity: number
    unit_price: number
    selected_options?: any
  }>
  subtotal: number
  tax: number
  delivery_fee: number
  discount: number
  total: number
  status: string
  payment_method: string
  created_at?: string
}

/**
 * Triggers a real browser print window with a professionally formatted Tax Invoice.
 */
export function handlePrintInvoice(order: PrintableOrder) {
  const printWindow = window.open('', '_blank', 'width=800,height=900')
  
  if (!printWindow) {
    toast.error('Pop-up blocked! Please allow pop-ups for this site to print invoices.')
    return
  }

  const itemsHtml = (order.items_detail && order.items_detail.length > 0)
    ? order.items_detail.map((item) => {
        const name = item.product_name || (item as any).name || (item as any).productName || 'Menu Item'
        return `
        <tr>
          <td style="padding: 10px 8px; border-bottom: 1px solid #e5e7eb;">
            <strong style="font-size: 14px; color: #111827;">${item.quantity}x ${name}</strong>
            ${item.selected_options && Array.isArray(item.selected_options) && item.selected_options.length > 0
              ? `<br><small style="color: #6b7280; font-size: 11px;">${item.selected_options.map((o: any) => `${o.optionName || 'Choice'}: ${o.choice || o}`).join(', ')}</small>`
              : ''}
          </td>
          <td style="padding: 10px 8px; border-bottom: 1px solid #e5e7eb; text-align: right; font-family: monospace; font-size: 13px;">₹${item.unit_price}</td>
          <td style="padding: 10px 8px; border-bottom: 1px solid #e5e7eb; text-align: right; font-family: monospace; font-size: 13px; font-weight: bold; color: #111827;">₹${item.unit_price * item.quantity}</td>
        </tr>
      `
      }).join('')
    : `<tr><td colspan="3" style="padding: 12px 8px; border-bottom: 1px solid #e5e7eb; font-weight: bold;">${order.items_summary || '1x Pizza Order'}</td></tr>`

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <title>Tax Invoice - ${order.id}</title>
        <style>
          * { box-sizing: border-box; }
          body {
            font-family: 'Helvetica Neue', Arial, sans-serif;
            color: #1f2937;
            padding: 24px;
            max-width: 650px;
            margin: 0 auto;
            line-height: 1.5;
            background: #fff;
          }
          .header {
            text-align: center;
            border-bottom: 2px dashed #b91c1c;
            padding-bottom: 16px;
            margin-bottom: 20px;
          }
          .store-title {
            font-size: 26px;
            font-weight: 800;
            color: #b91c1c;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .store-info {
            font-size: 12px;
            color: #4b5563;
            margin-top: 4px;
          }
          .badge {
            display: inline-block;
            background: #fef2f2;
            color: #b91c1c;
            border: 1px solid #fca5a5;
            padding: 2px 8px;
            border-radius: 9999px;
            font-size: 10px;
            font-weight: bold;
            text-transform: uppercase;
            margin-top: 6px;
          }
          .section {
            background: #f9fafb;
            border: 1px solid #e5e7eb;
            border-radius: 10px;
            padding: 14px;
            margin-bottom: 18px;
            font-size: 13px;
          }
          .grid-2 {
            display: flex;
            justify-content: space-between;
            gap: 16px;
          }
          .grid-2 > div { flex: 1; }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
          }
          th {
            text-align: left;
            background: #f3f4f6;
            padding: 8px;
            border-bottom: 2px solid #e5e7eb;
            font-size: 11px;
            text-transform: uppercase;
            color: #4b5563;
          }
          .summary-box {
            width: 260px;
            margin-left: auto;
            font-size: 13px;
          }
          .summary-row {
            display: flex;
            justify-content: space-between;
            padding: 4px 0;
            color: #4b5563;
          }
          .grand-total {
            display: flex;
            justify-content: space-between;
            padding: 10px 0 4px 0;
            border-top: 2px solid #b91c1c;
            border-bottom: 2px solid #b91c1c;
            font-size: 16px;
            font-weight: bold;
            color: #b91c1c;
            margin-top: 6px;
          }
          .footer {
            text-align: center;
            margin-top: 40px;
            padding-top: 16px;
            border-top: 1px dashed #d1d5db;
            font-size: 11px;
            color: #6b7280;
          }
          @media print {
            body { padding: 0; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="store-title">Pizza Expert Prayagraj</div>
          <div class="store-info">Allapur, Prayagraj, Uttar Pradesh - 211006</div>
          <div class="store-info">Phone: +91 99999 99999 | GSTIN: 09AAAAA0000A1Z5 | FSSAI: 22723000000000</div>
          <div class="badge">Official Tax Invoice</div>
        </div>

        <div class="section grid-2">
          <div>
            <strong>INVOICE NO:</strong> <span style="font-family: monospace;">${order.id}</span><br>
            <strong>DATE & TIME:</strong> ${new Date(order.created_at || Date.now()).toLocaleString()}<br>
            <strong>STATUS:</strong> ${order.status.toUpperCase()}
          </div>
          <div style="text-align: right;">
            <strong>PAYMENT MODE:</strong> ${(order.payment_method || 'RAZORPAY').toUpperCase()}<br>
            <strong>ORDER TYPE:</strong> Home Delivery
          </div>
        </div>

        <div class="section">
          <strong style="color: #b91c1c; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px;">Customer & Delivery Details</strong><br>
          <div style="margin-top: 6px; line-height: 1.6;">
            <strong>Name:</strong> ${order.customer}<br>
            <strong>Phone:</strong> ${order.phone}<br>
            ${order.email ? `<strong>Email:</strong> ${order.email}<br>` : ''}
            <strong>Address:</strong> ${order.address} ${order.pincode ? `(${order.pincode})` : ''}<br>
            ${order.notes ? `<strong>Notes:</strong> <em style="color: #b45309;">${order.notes}</em>` : ''}
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Item Description</th>
              <th style="text-align: right;">Rate</th>
              <th style="text-align: right;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        <div class="summary-box">
          <div class="summary-row">
            <span>Subtotal:</span>
            <span style="font-family: monospace;">₹${order.subtotal}</span>
          </div>
          <div class="summary-row">
            <span>GST Tax (5%):</span>
            <span style="font-family: monospace;">₹${order.tax}</span>
          </div>
          <div class="summary-row">
            <span>Delivery Fee:</span>
            <span style="font-family: monospace;">₹${order.delivery_fee}</span>
          </div>
          ${order.discount > 0 ? `
          <div class="summary-row" style="color: #047857;">
            <span>Discount:</span>
            <span style="font-family: monospace;">-₹${order.discount}</span>
          </div>
          ` : ''}
          <div class="grand-total">
            <span>Total Amount:</span>
            <span style="font-family: monospace;">₹${order.total}</span>
          </div>
        </div>

        <div style="clear: both;"></div>

        <div class="footer">
          Thank you for choosing Pizza Expert Prayagraj!<br>
          Freshly Hand-Tossed • Wood-Fired • Fast Delivery
        </div>

        <script>
          window.onload = function() {
            window.print();
            setTimeout(function() { window.close(); }, 500);
          };
        </script>
      </body>
    </html>
  `

  printWindow.document.open()
  printWindow.document.write(htmlContent)
  printWindow.document.close()
}
