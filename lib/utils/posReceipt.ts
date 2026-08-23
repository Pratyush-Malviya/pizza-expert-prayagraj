/**
 * Thermal POS Receipt & KOT Printing Engine
 * Works seamlessly with 80mm and 58mm ESC/POS thermal printers & standard browser printers.
 * Uses a non-blocking hidden iframe so that browser pop-up blockers NEVER block printing.
 */

export interface POSReceiptItem {
  name: string
  quantity: number
  unitPrice: number
  totalPrice: number
  selectedOptions?: Array<{ optionName?: string; choice?: string } | string>
  notes?: string
}

export interface POSReceiptPayment {
  tenderType: string
  amount: number
  changeGiven?: number
  reference?: string
}

export interface POSReceiptOrderData {
  orderId: string
  kotNumber?: string
  orderType: string
  tableNumber?: string
  cashierName?: string
  customerName?: string
  customerPhone?: string
  createdAt?: string | Date
  items: POSReceiptItem[]
  subtotal: number
  discount?: number
  discountReason?: string
  deliveryFee?: number
  cgst?: number
  sgst?: number
  tax?: number
  roundOff?: number
  total: number
  payments?: POSReceiptPayment[]
  businessInfo?: {
    name?: string
    address?: string
    phone?: string
    gstin?: string
    fssai?: string
    footerMessage?: string
  }
}

export interface POSKOTData {
  kotNumber: string
  orderId: string
  orderType: string
  tableNumber?: string
  serverName?: string
  createdAt?: string | Date
  specialNotes?: string
  items: Array<{
    name: string
    quantity: number
    course?: string
    selectedOptions?: Array<{ optionName?: string; choice?: string } | string>
    notes?: string
  }>
}

/**
 * 100% reliable hidden iframe printer.
 * Never blocked by browser popup blockers.
 */
export function printReceiptHtml(htmlContent: string) {
  if (typeof window === 'undefined') return

  try {
    let iframe = document.getElementById('pos-thermal-print-frame') as HTMLIFrameElement | null

    if (!iframe) {
      iframe = document.createElement('iframe')
      iframe.id = 'pos-thermal-print-frame'
      iframe.name = 'pos-thermal-print-frame'
      iframe.style.position = 'fixed'
      iframe.style.right = '0'
      iframe.style.bottom = '0'
      iframe.style.width = '0px'
      iframe.style.height = '0px'
      iframe.style.border = 'none'
      iframe.style.zIndex = '-9999'
      document.body.appendChild(iframe)
    }

    const frameDoc = iframe.contentWindow?.document || iframe.contentDocument
    if (!frameDoc) {
      throw new Error('Unable to access print frame document')
    }

    frameDoc.open()
    frameDoc.write(htmlContent)
    frameDoc.close()

    // Allow CSS & fonts to settle in iframe before invoking print
    setTimeout(() => {
      try {
        iframe?.contentWindow?.focus()
        iframe?.contentWindow?.print()
      } catch (err) {
        console.warn('Iframe print failed, falling back to new window:', err)
        const printWin = window.open('', '_blank', 'width=350,height=600')
        if (printWin) {
          printWin.document.open()
          printWin.document.write(htmlContent)
          printWin.document.close()
          printWin.focus()
          setTimeout(() => {
            printWin.print()
            printWin.close()
          }, 350)
        }
      }
    }, 200)
  } catch (e) {
    console.error('POS Print Error:', e)
  }
}

/**
 * Generates an 80mm / 58mm formatted Tax Invoice HTML string
 */
export function generateThermalReceiptHtml(data: POSReceiptOrderData): string {
  const biz = {
    name: data.businessInfo?.name || 'PIZZA EXPERT',
    address: data.businessInfo?.address || 'Civil Lines, Prayagraj, UP 211001',
    phone: data.businessInfo?.phone || '+91 91234 56789',
    gstin: data.businessInfo?.gstin || '09ABCDE1234F1Z5',
    fssai: data.businessInfo?.fssai || '12724052000123',
    footer: data.businessInfo?.footerMessage || 'Thank you for dining with us! Visit again.',
  }

  const orderTime = data.createdAt ? new Date(data.createdAt).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }) : new Date().toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })

  const orderTypeLabel = data.orderType === 'dine_in'
    ? `DINE-IN ${data.tableNumber ? `(Table ${data.tableNumber})` : ''}`
    : data.orderType === 'takeaway'
    ? 'TAKEAWAY / PICKUP'
    : data.orderType === 'delivery'
    ? 'DIRECT DELIVERY'
    : data.orderType.toUpperCase()

  const itemsHtml = data.items.map((item) => {
    const itemName =
      item.name ||
      (item as any).productName ||
      (item as any).product_name ||
      'Menu Item'

    const optionsStr = item.selectedOptions && Array.isArray(item.selectedOptions) && item.selectedOptions.length > 0
      ? item.selectedOptions.map(o => typeof o === 'string' ? o : (o.choice || o.optionName)).filter(Boolean).join(', ')
      : ''

    return `
      <tr>
        <td style="padding: 3px 0; vertical-align: top; width: 24px; font-weight: bold;">${item.quantity}x</td>
        <td style="padding: 3px 4px; vertical-align: top;">
          <div style="font-weight: bold;">${itemName}</div>
          ${optionsStr ? `<div style="font-size: 9px; color: #555;">${optionsStr}</div>` : ''}
          ${item.notes ? `<div style="font-size: 9px; font-style: italic; color: #666;">Note: ${item.notes}</div>` : ''}
        </td>
        <td style="padding: 3px 0; vertical-align: top; text-align: right; width: 60px; font-weight: bold;">
          ₹${Number(item.totalPrice || item.unitPrice * item.quantity).toFixed(2)}
        </td>
      </tr>
    `
  }).join('')

  const cgstAmt = data.cgst !== undefined ? data.cgst : (data.tax ? data.tax / 2 : 0)
  const sgstAmt = data.sgst !== undefined ? data.sgst : (data.tax ? data.tax / 2 : 0)

  const paymentsHtml = data.payments && data.payments.length > 0
    ? data.payments.map(p => `
        <div style="display: flex; justify-content: space-between; font-size: 11px; margin-top: 1px;">
          <span style="text-transform: uppercase;">${p.tenderType}${p.reference ? ` (${p.reference.slice(-6)})` : ''}:</span>
          <span>₹${Number(p.amount).toFixed(2)}</span>
        </div>
        ${p.changeGiven && p.changeGiven > 0 ? `
          <div style="display: flex; justify-content: space-between; font-size: 11px; font-weight: bold; margin-top: 1px;">
            <span>Change Returned:</span>
            <span>₹${Number(p.changeGiven).toFixed(2)}</span>
          </div>
        ` : ''}
      `).join('')
    : `
      <div style="display: flex; justify-content: space-between; font-size: 11px;">
        <span>PAID & SETTLED:</span>
        <span style="font-weight: bold;">₹${Number(data.total).toFixed(2)}</span>
      </div>
    `

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Receipt - #${data.orderId.slice(-6).toUpperCase()}</title>
  <style>
    @page {
      margin: 0;
      size: 80mm auto;
    }
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
      font-family: 'Courier New', Courier, monospace, 'Lucida Console';
    }
    body {
      width: 76mm;
      max-width: 80mm;
      margin: 0 auto;
      padding: 8px 4px;
      color: #000;
      background: #fff;
      font-size: 11px;
      line-height: 1.25;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .bold { font-weight: bold; }
    .title { font-size: 15px; font-weight: 900; letter-spacing: 0.5px; }
    .divider { border-top: 1px dashed #000; margin: 5px 0; }
    .divider-solid { border-top: 1px solid #000; margin: 5px 0; }
    .row { display: flex; justify-content: space-between; margin: 2px 0; }
    .items-table { width: 100%; border-collapse: collapse; margin: 4px 0; font-size: 11px; }
    .total-banner {
      border: 1px solid #000;
      padding: 4px;
      margin: 5px 0;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 13px;
      font-weight: 900;
    }
    @media print {
      body { width: 100%; margin: 0; padding: 4px; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <!-- Brand Header -->
  <div class="text-center">
    <div class="title">🍕 ${biz.name}</div>
    <div style="font-size: 10px; margin-top: 1px;">${biz.address}</div>
    <div style="font-size: 10px;">Ph: ${biz.phone}</div>
    <div style="font-size: 9px; margin-top: 2px;">GSTIN: <strong>${biz.gstin}</strong></div>
    ${biz.fssai ? `<div style="font-size: 9px;">FSSAI Lic No: ${biz.fssai}</div>` : ''}
    <div style="font-size: 11px; font-weight: bold; margin-top: 3px; letter-spacing: 1px;">*** TAX INVOICE ***</div>
  </div>

  <div class="divider"></div>

  <!-- Order Meta -->
  <div>
    <div class="row">
      <span>Order ID: <strong>#${data.orderId.slice(-6).toUpperCase()}</strong></span>
      <span>${data.kotNumber ? `KOT: <strong>${data.kotNumber}</strong>` : ''}</span>
    </div>
    <div class="row">
      <span>Date: ${orderTime}</span>
    </div>
    <div class="row">
      <span>Type: <strong>${orderTypeLabel}</strong></span>
    </div>
    ${data.cashierName ? `<div class="row"><span>Cashier: ${data.cashierName}</span></div>` : ''}
    ${data.customerName ? `<div class="row"><span>Customer: ${data.customerName} ${data.customerPhone ? `(${data.customerPhone})` : ''}</span></div>` : ''}
  </div>

  <div class="divider"></div>

  <!-- Items Table -->
  <table class="items-table">
    <thead>
      <tr style="border-bottom: 1px solid #000; font-size: 10px; font-weight: bold;">
        <th style="text-align: left; width: 24px; padding-bottom: 2px;">QTY</th>
        <th style="text-align: left; padding-bottom: 2px;">ITEM DESCRIPTION</th>
        <th style="text-align: right; width: 60px; padding-bottom: 2px;">AMT (₹)</th>
      </tr>
    </thead>
    <tbody>
      ${itemsHtml}
    </tbody>
  </table>

  <div class="divider"></div>

  <!-- Totals Calculation -->
  <div>
    <div class="row">
      <span>Item Subtotal:</span>
      <span>₹${Number(data.subtotal).toFixed(2)}</span>
    </div>
    ${data.discount && data.discount > 0 ? `
      <div class="row" style="color: #000;">
        <span>Discount ${data.discountReason ? `(${data.discountReason})` : ''}:</span>
        <span>-₹${Number(data.discount).toFixed(2)}</span>
      </div>
    ` : ''}
    ${data.deliveryFee && data.deliveryFee > 0 ? `
      <div class="row">
        <span>Delivery / Packing Fee:</span>
        <span>₹${Number(data.deliveryFee).toFixed(2)}</span>
      </div>
    ` : ''}
    <div class="row" style="font-size: 10px;">
      <span>CGST @ 2.5%:</span>
      <span>₹${Number(cgstAmt).toFixed(2)}</span>
    </div>
    <div class="row" style="font-size: 10px;">
      <span>SGST @ 2.5%:</span>
      <span>₹${Number(sgstAmt).toFixed(2)}</span>
    </div>
    ${data.roundOff && Math.abs(data.roundOff) > 0 ? `
      <div class="row" style="font-size: 10px;">
        <span>Round Off:</span>
        <span>₹${Number(data.roundOff).toFixed(2)}</span>
      </div>
    ` : ''}
  </div>

  <!-- Big Total -->
  <div class="total-banner">
    <span>NET PAYABLE</span>
    <span>₹${Number(data.total).toFixed(2)}</span>
  </div>

  <!-- Payment Mode Breakdown -->
  <div style="margin: 4px 0;">
    <div style="font-size: 9px; font-weight: bold; text-transform: uppercase; margin-bottom: 2px;">Payment Summary:</div>
    ${paymentsHtml}
  </div>

  <div class="divider"></div>

  <!-- Footer & Barcode -->
  <div class="text-center" style="margin-top: 6px;">
    <div style="font-weight: bold; font-size: 10px;">${biz.footer}</div>
    <div style="font-size: 9px; margin-top: 2px; color: #444;">Prices inclusive of all applicable taxes</div>
    <div style="font-size: 8px; margin-top: 3px; font-family: monospace;">* * * POWERED BY PIZZA EXPERT POS * * *</div>
  </div>
</body>
</html>
  `
}

/**
 * Generates Kitchen Order Ticket (KOT) HTML for kitchen/bar thermal printer
 */
export function generateKOTReceiptHtml(kot: POSKOTData): string {
  const timeStr = kot.createdAt ? new Date(kot.createdAt).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  }) : new Date().toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  })

  const itemsHtml = kot.items.map((item, idx) => {
    const itemName =
      item.name ||
      (item as any).productName ||
      (item as any).product_name ||
      'Kitchen Item'

    const opts = item.selectedOptions && Array.isArray(item.selectedOptions) && item.selectedOptions.length > 0
      ? item.selectedOptions.map(o => typeof o === 'string' ? o : (o.choice || o.optionName)).filter(Boolean).join(', ')
      : ''

    return `
      <tr style="border-bottom: 1px dashed #444;">
        <td style="font-size: 16px; font-weight: 900; vertical-align: top; width: 35px; padding: 4px 0;">
          [${item.quantity}]
        </td>
        <td style="padding: 4px 0; vertical-align: top;">
          <div style="font-size: 14px; font-weight: 900;">${itemName}</div>
          ${opts ? `<div style="font-size: 11px; font-weight: bold; color: #222; margin-top: 1px;">👉 ${opts}</div>` : ''}
          ${item.notes ? `<div style="font-size: 11px; font-weight: bold; background: #eee; padding: 1px 3px; margin-top: 2px; display: inline-block;">⚠️ ${item.notes}</div>` : ''}
        </td>
      </tr>
    `
  }).join('')

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>KOT - ${kot.kotNumber}</title>
  <style>
    @page { margin: 0; size: 80mm auto; }
    * { margin: 0; padding: 0; box-sizing: border-box; font-family: 'Courier New', Courier, monospace; }
    body {
      width: 76mm;
      max-width: 80mm;
      margin: 0 auto;
      padding: 6px 4px;
      color: #000;
      background: #fff;
    }
    .text-center { text-align: center; }
    .kot-title { font-size: 20px; font-weight: 900; border-bottom: 2px solid #000; padding-bottom: 2px; }
    .table-banner {
      background: #000;
      color: #fff;
      font-size: 16px;
      font-weight: 900;
      padding: 4px;
      margin: 4px 0;
      text-align: center;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .meta-row { display: flex; justify-content: space-between; font-size: 11px; font-weight: bold; margin: 2px 0; }
    .divider { border-top: 2px solid #000; margin: 4px 0; }
    table { width: 100%; border-collapse: collapse; }
  </style>
</head>
<body>
  <div class="text-center kot-title">*** KITCHEN ORDER ***</div>
  
  <div class="table-banner">
    ${kot.tableNumber ? `TABLE: ${kot.tableNumber.toUpperCase()}` : `TYPE: ${kot.orderType.toUpperCase()}`}
  </div>

  <div class="meta-row">
    <span>KOT #: <strong>${kot.kotNumber}</strong></span>
    <span>Time: ${timeStr}</span>
  </div>
  <div class="meta-row">
    <span>Order: #${kot.orderId.slice(-6).toUpperCase()}</span>
    <span>${kot.serverName ? `Staff: ${kot.serverName}` : ''}</span>
  </div>

  ${kot.specialNotes ? `
    <div style="margin: 4px 0; padding: 3px; border: 1px solid #000; font-size: 11px; font-weight: bold;">
      ORDER NOTE: ${kot.specialNotes}
    </div>
  ` : ''}

  <div class="divider"></div>

  <table>
    <tbody>
      ${itemsHtml}
    </tbody>
  </table>

  <div class="divider"></div>
  <div style="text-align: center; font-size: 10px; font-weight: bold; margin-top: 4px;">
    END OF KOT • PREPARE WITH SPEED & QUALITY
  </div>
</body>
</html>
  `
}

/**
 * Triggers instant printing of an Order Receipt
 */
export function triggerPrintPOSReceipt(data: POSReceiptOrderData) {
  const html = generateThermalReceiptHtml(data)
  printReceiptHtml(html)
}

/**
 * Triggers instant printing of a Kitchen Order Ticket (KOT)
 */
export function triggerPrintKOT(kot: POSKOTData) {
  const html = generateKOTReceiptHtml(kot)
  printReceiptHtml(html)
}
