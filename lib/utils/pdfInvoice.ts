import { formatPrice } from '@/lib/utils'

export interface GSTInvoiceData {
  invoiceNumber: string
  orderId: string
  date: string
  customerName: string
  customerAddress: string
  customerPhone: string
  gstin: string
  items: Array<{
    name: string
    quantity: number
    unitPrice: number
    amount: number
  }>
  subtotal: number
  cgst: number // 2.5%
  sgst: number // 2.5%
  deliveryFee: number
  discount: number
  total: number
}

export function printGSTInvoice(data: GSTInvoiceData) {
  if (typeof window === 'undefined') return

  const printWindow = window.open('', '_blank')
  if (!printWindow) return

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>GST Tax Invoice - ${data.invoiceNumber}</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; font-size: 12px; color: #1C1917; padding: 25px; max-width: 800px; margin: 0 auto; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; border-b: 2px solid #B91C1C; padding-bottom: 15px; margin-bottom: 20px; }
          .brand { font-size: 22px; font-weight: bold; color: #B91C1C; font-family: serif; }
          .subbrand { font-size: 10px; color: #78716C; text-transform: uppercase; letter-spacing: 1px; }
          .invoice-title { text-align: right; }
          .invoice-title h2 { margin: 0; font-size: 18px; color: #1C1917; }
          .grid { display: flex; justify-content: space-between; margin-bottom: 25px; font-size: 11px; }
          .box { background: #FDFBF7; border: 1px solid #E7E0D8; padding: 12px; border-radius: 8px; width: 48%; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          th { background: #F5F2EC; text-align: left; padding: 8px; font-size: 11px; border-bottom: 1px solid #E7E0D8; text-transform: uppercase; }
          td { padding: 8px; border-bottom: 1px solid #E7E0D8; font-size: 11px; }
          .totals { width: 300px; margin-left: auto; margin-top: 15px; }
          .totals-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 11px; }
          .grand-total { font-size: 14px; font-weight: bold; color: #B91C1C; border-top: 2px solid #B91C1C; padding-top: 6px; }
          .footer { text-align: center; margin-top: 40px; font-size: 10px; color: #78716C; border-top: 1px solid #E7E0D8; padding-top: 15px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="brand">PIZZA EXPERT PRAYAGRAJ</div>
            <div class="subbrand">Authentic Wood-Fired Pizzeria • Allapur Branch</div>
            <div style="margin-top: 4px; color: #57534E;">GSTIN: ${data.gstin}</div>
          </div>
          <div class="invoice-title">
            <h2>TAX INVOICE</h2>
            <div>Invoice #: <strong>${data.invoiceNumber}</strong></div>
            <div>Date: ${data.date}</div>
            <div>Order ID: ${data.orderId}</div>
          </div>
        </div>

        <div class="grid">
          <div class="box">
            <strong>Billed To / Customer Details:</strong><br/>
            Name: ${data.customerName}<br/>
            Phone: ${data.customerPhone}<br/>
            Address: ${data.customerAddress}
          </div>
          <div class="box">
            <strong>Supplier Details:</strong><br/>
            Pizza Expert Allapur, Prayagraj<br/>
            State Code: 09 (Uttar Pradesh)<br/>
            FSSAI License: 12724999000123
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Item Description</th>
              <th style="text-align: right;">Qty</th>
              <th style="text-align: right;">Unit Price</th>
              <th style="text-align: right;">Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            ${data.items.map(item => `
              <tr>
                <td>${item.name}</td>
                <td style="text-align: right;">${item.quantity}</td>
                <td style="text-align: right;">₹${item.unitPrice.toFixed(2)}</td>
                <td style="text-align: right;">₹${item.amount.toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="totals">
          <div class="totals-row"><span>Subtotal:</span><span>₹${data.subtotal.toFixed(2)}</span></div>
          ${data.discount > 0 ? `<div class="totals-row" style="color:#16A34A;"><span>Discount:</span><span>-₹${data.discount.toFixed(2)}</span></div>` : ''}
          <div class="totals-row"><span>CGST (2.5%):</span><span>₹${data.cgst.toFixed(2)}</span></div>
          <div class="totals-row"><span>SGST (2.5%):</span><span>₹${data.sgst.toFixed(2)}</span></div>
          <div class="totals-row"><span>Delivery Charges:</span><span>₹${data.deliveryFee.toFixed(2)}</span></div>
          <div class="totals-row grand-total"><span>Grand Total (Incl. Taxes):</span><span>₹${data.total.toFixed(2)}</span></div>
        </div>

        <div class="footer">
          Thank you for dining with Pizza Expert Prayagraj!<br/>
          This is a computer-generated tax invoice. No signature required.
        </div>

        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
    </html>
  `

  printWindow.document.write(htmlContent)
  printWindow.document.close()
}
