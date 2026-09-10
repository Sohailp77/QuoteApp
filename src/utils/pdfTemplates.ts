import { Quote, DirectSale, Reorder, CompanySettings } from '../types';

function escapeHtml(text: any): string {
  if (text === null || text === undefined) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

const formatMoney = (amount: number, currency = '₹') =>
  `${currency} ${Number(amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatDate = (dateStr?: string) => {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

/**
 * Common authentic HTML/CSS styles inspired by modern corporate invoice designs.
 */
const getBaseCSS = (accentColor = '#2E7D32') => `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
  
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    color: #1E293B;
    background-color: #FFFFFF;
    padding: 36px 40px;
    font-size: 13px;
    line-height: 1.5;
  }

  .header-table {
    width: 100%;
    margin-bottom: 28px;
    border-collapse: collapse;
  }
  .header-table td {
    vertical-align: top;
  }

  .company-brand {
    font-size: 22px;
    font-weight: 800;
    color: ${accentColor};
    letter-spacing: -0.5px;
    margin-bottom: 4px;
  }
  .company-meta {
    font-size: 12px;
    color: #475569;
    line-height: 1.4;
  }
  .company-meta strong {
    color: #1E293B;
  }

  .logo-box {
    text-align: right;
  }
  .logo-img {
    max-height: 65px;
    max-width: 200px;
    object-fit: contain;
  }
  .logo-placeholder {
    display: inline-block;
    border: 2px dashed #CBD5E1;
    border-radius: 8px;
    padding: 10px 20px;
    color: #94A3B8;
    font-size: 12px;
    font-weight: 600;
  }

  .doc-title-row {
    margin-bottom: 24px;
    text-align: right;
  }
  .doc-title {
    font-size: 32px;
    font-weight: 800;
    color: ${accentColor};
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  .billing-table {
    width: 100%;
    margin-bottom: 30px;
    border-collapse: collapse;
  }
  .billing-table td {
    vertical-align: top;
  }
  .section-label {
    font-size: 11px;
    font-weight: 800;
    color: ${accentColor};
    text-transform: uppercase;
    letter-spacing: 0.8px;
    margin-bottom: 6px;
  }
  .party-name {
    font-size: 16px;
    font-weight: 700;
    color: #0F172A;
    margin-bottom: 4px;
  }
  .party-details {
    font-size: 12px;
    color: #475569;
    line-height: 1.5;
  }

  .meta-grid {
    margin-left: auto;
    border-collapse: collapse;
  }
  .meta-grid td {
    padding: 3px 8px;
    font-size: 12px;
  }
  .meta-label {
    font-weight: 700;
    color: ${accentColor};
    text-align: right;
  }
  .meta-value {
    font-weight: 600;
    color: #0F172A;
    text-align: right;
  }

  /* Items Table */
  .items-table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 28px;
    border: 1px solid #E2E8F0;
    border-radius: 6px;
    overflow: hidden;
  }
  .items-table th {
    background-color: ${accentColor};
    color: #FFFFFF;
    font-size: 11px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.6px;
    padding: 10px 14px;
    text-align: left;
  }
  .items-table th.num-col {
    text-align: right;
  }
  .items-table th.center-col {
    text-align: center;
  }
  .items-table td {
    padding: 10px 14px;
    font-size: 12px;
    color: #334155;
    border-bottom: 1px solid #F1F5F9;
  }
  .items-table tr:nth-child(even) {
    background-color: #F8FAFC;
  }
  .item-name {
    font-weight: 700;
    color: #0F172A;
  }
  .item-desc {
    font-size: 11px;
    color: #64748B;
    margin-top: 2px;
  }

  /* Summary Table */
  .summary-container {
    width: 100%;
    margin-bottom: 30px;
  }
  .summary-table {
    margin-left: auto;
    width: 280px;
    border-collapse: collapse;
    border: 1px solid #E2E8F0;
    border-radius: 6px;
    overflow: hidden;
  }
  .summary-table td {
    padding: 8px 14px;
    font-size: 12px;
  }
  .summary-label {
    color: #475569;
    font-weight: 600;
  }
  .summary-value {
    text-align: right;
    font-weight: 700;
    color: #0F172A;
  }
  .grand-total-row {
    background-color: #F1F5F9;
    border-top: 2px solid ${accentColor};
  }
  .grand-total-row .summary-label {
    font-size: 14px;
    font-weight: 800;
    color: ${accentColor};
  }
  .grand-total-row .summary-value {
    font-size: 16px;
    font-weight: 800;
    color: ${accentColor};
  }

  /* Footer Sections */
  .bottom-section {
    width: 100%;
    border-collapse: collapse;
    margin-top: 20px;
  }
  .bottom-section td {
    vertical-align: top;
    padding: 12px;
    font-size: 11px;
    color: #475569;
  }
  .box-title {
    font-size: 11px;
    font-weight: 800;
    color: ${accentColor};
    text-transform: uppercase;
    margin-bottom: 6px;
  }

  .footer-bar {
    margin-top: 40px;
    padding-top: 14px;
    border-top: 1px solid #E2E8F0;
    display: flex;
    justify-content: space-between;
    font-size: 11px;
    color: #64748B;
  }
  .footer-bar a {
    color: ${accentColor};
    text-decoration: none;
  }
`;

/**
 * Generate Authentic Quote / Invoice PDF HTML
 */
export function generateQuotePDFHtml(quote: Quote, company: CompanySettings | null, docType: 'QUOTATION' | 'INVOICE' = 'QUOTATION'): string {
  const currency = company?.currency || '₹';
  const companyName = company?.company_name || 'Your Company';
  const companyAddress = company?.address || '';
  const companyPhone = company?.phone || '';
  const companyEmail = company?.email || '';
  const companyGst = company?.gst_number || '';
  const companyWebsite = company?.website || '';
  const logoUrl = company?.logo_url;

  const items = quote.items || [];
  const itemsRows = items.map((item, idx) => `
    <tr>
      <td style="width: 40px; text-align: center;">${idx + 1}</td>
      <td>
        <div class="item-name">${escapeHtml(item.product_name)}</div>
        ${item.formula_text ? `<div class="item-desc">${escapeHtml(item.formula_text)}</div>` : ''}
      </td>
      <td class="num-col" style="width: 70px;">${item.quantity}</td>
      <td class="num-col" style="width: 100px;">${formatMoney(item.unit_price, currency)}</td>
      ${item.discount ? `<td class="num-col" style="width: 80px;">${item.discount}%</td>` : `<td class="num-col" style="width: 80px;">-</td>`}
      <td class="num-col" style="width: 110px;">${formatMoney(item.line_total, currency)}</td>
    </tr>
  `).join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${docType} #${escapeHtml(quote.quote_number)}</title>
  <style>${getBaseCSS('#2E7D32')}</style>
</head>
<body>

  <!-- Top Header Table -->
  <table class="header-table">
    <tr>
      <td style="width: 60%;">
        <div class="section-label">FROM</div>
        <div class="company-brand">${escapeHtml(companyName)}</div>
        <div class="company-meta">
          ${companyAddress ? `<div>${escapeHtml(companyAddress)}</div>` : ''}
          ${companyPhone ? `<div>Tel: <strong>${escapeHtml(companyPhone)}</strong></div>` : ''}
          ${companyEmail ? `<div>Email: <strong>${escapeHtml(companyEmail)}</strong></div>` : ''}
          ${companyGst ? `<div>GSTIN: <strong>${escapeHtml(companyGst)}</strong></div>` : ''}
        </div>
      </td>
      <td style="width: 40%;" class="logo-box">
        ${logoUrl ? `<img src="${logoUrl}" class="logo-img" alt="Logo" />` : `<div class="logo-placeholder">${escapeHtml(companyName)}</div>`}
      </td>
    </tr>
  </table>

  <div class="doc-title-row">
    <div class="doc-title">${docType}</div>
  </div>

  <!-- Billing & Metadata Table -->
  <table class="billing-table">
    <tr>
      <td style="width: 55%;">
        <div class="section-label">TO</div>
        <div class="party-name">${escapeHtml(quote.client_name || 'Customer')}</div>
        <div class="party-details">
          ${quote.client_email ? `<div>Email: ${escapeHtml(quote.client_email)}</div>` : ''}
          ${quote.client_phone ? `<div>Phone: ${escapeHtml(quote.client_phone)}</div>` : ''}
        </div>
      </td>
      <td style="width: 45%;">
        <table class="meta-grid">
          <tr>
            <td class="meta-label">${docType === 'INVOICE' ? 'Invoice #:' : 'Quote #:'}</td>
            <td class="meta-value">${escapeHtml(quote.quote_number)}</td>
          </tr>
          <tr>
            <td class="meta-label">Date:</td>
            <td class="meta-value">${formatDate(quote.created_at)}</td>
          </tr>
          <tr>
            <td class="meta-label">${docType === 'INVOICE' ? 'Due Date:' : 'Valid Until:'}</td>
            <td class="meta-value">${formatDate(quote.valid_until)}</td>
          </tr>
          <tr>
            <td class="meta-label">Status:</td>
            <td class="meta-value" style="color: #2E7D32;">${escapeHtml(quote.status || 'Draft')}</td>
          </tr>
        </table>
      </td>
    </tr>
  </table>

  <!-- Items Table -->
  <table class="items-table">
    <thead>
      <tr>
        <th class="center-col">#</th>
        <th>Description</th>
        <th class="num-col">QTY</th>
        <th class="num-col">Unit Price</th>
        <th class="num-col">Discount</th>
        <th class="num-col">Amount</th>
      </tr>
    </thead>
    <tbody>
      ${itemsRows}
    </tbody>
  </table>

  <!-- Summary Container -->
  <div class="summary-container">
    <table class="summary-table">
      <tr>
        <td class="summary-label">Subtotal</td>
        <td class="summary-value">${formatMoney(quote.subtotal, currency)}</td>
      </tr>
      ${quote.discount > 0 ? `
        <tr>
          <td class="summary-label" style="color: #E53935;">Discount</td>
          <td class="summary-value" style="color: #E53935;">-${formatMoney(quote.discount, currency)}</td>
        </tr>
      ` : ''}
      ${quote.tax > 0 ? `
        <tr>
          <td class="summary-label">Tax / GST</td>
          <td class="summary-value">+${formatMoney(quote.tax, currency)}</td>
        </tr>
      ` : ''}
      <tr class="grand-total-row">
        <td class="summary-label">Total</td>
        <td class="summary-value">${formatMoney(quote.total, currency)}</td>
      </tr>
    </table>
  </div>

  <!-- Footer Info & Terms -->
  <table class="bottom-section" style="border: 1px solid #E2E8F0; border-radius: 6px;">
    <tr>
      ${company?.bank_name || company?.account_number ? `
        <td style="width: 50%; border-right: 1px solid #E2E8F0;">
          <div class="box-title">Bank Payment Details</div>
          <div>Bank Name: <strong>${escapeHtml(company.bank_name)}</strong></div>
          <div>Account No: <strong>${escapeHtml(company.account_number)}</strong></div>
          <div>IFSC Code: <strong>${escapeHtml(company.ifsc_code)}</strong></div>
        </td>
      ` : ''}
      <td style="width: 50%;">
        <div class="box-title">Terms & Conditions</div>
        <div>${company?.terms_conditions ? escapeHtml(company.terms_conditions) : '1. Payment is due within 14 days of invoice date.'}</div>
        <div>Thank you for your business!</div>
      </td>
    </tr>
  </table>

  <!-- Fixed Page Footer Bar -->
  <div class="footer-bar">
    <div>${companyPhone ? `Tel: ${escapeHtml(companyPhone)}` : ''}</div>
    <div>${companyEmail ? `Email: ${escapeHtml(companyEmail)}` : ''}</div>
    <div>${companyWebsite ? `Web: ${escapeHtml(companyWebsite)}` : ''}</div>
  </div>

</body>
</html>
  `;
}

/**
 * Generate Authentic Purchase Order PDF HTML for Vendors
 */
export function generatePurchaseOrderPDFHtml(order: Reorder, company: CompanySettings | null): string {
  const currency = company?.currency || '₹';
  const companyName = company?.company_name || 'Your Company';
  const companyAddress = company?.address || '';
  const companyPhone = company?.phone || '';
  const companyEmail = company?.email || '';
  const companyGst = company?.gst_number || '';
  const companyWebsite = company?.website || '';
  const logoUrl = company?.logo_url;

  const items = order.items || [];
  const itemsRows = items.map((item, idx) => {
    const cost = (item as any).estimated_unit_cost || (item as any).unit_cost || (item as any).unit_price || 0;
    const qty = item.reorder_quantity || (item as any).qty || 1;
    const total = cost * qty;
    return `
    <tr>
      <td style="width: 40px; text-align: center;">${idx + 1}</td>
      <td>
        <div class="item-name">${escapeHtml(item.product_name)}</div>
      </td>
      <td class="num-col" style="width: 90px;">${qty}</td>
      <td class="num-col" style="width: 120px;">${formatMoney(cost, currency)}</td>
      <td class="num-col" style="width: 120px;">${formatMoney(total, currency)}</td>
    </tr>
  `;
  }).join('');

  const orderTotal = order.total_estimated_cost || items.reduce((sum, i) => {
    const cost = (i as any).estimated_unit_cost || (i as any).unit_cost || (i as any).unit_price || 0;
    const qty = i.reorder_quantity || (i as any).qty || 1;
    return sum + (cost * qty);
  }, 0);

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Purchase Order #${escapeHtml(order.order_number)}</title>
  <style>${getBaseCSS('#1E293B')}</style>
</head>
<body>

  <!-- Top Header Table -->
  <table class="header-table">
    <tr>
      <td style="width: 60%;">
        <div class="section-label">BUYER (FROM)</div>
        <div class="company-brand">${escapeHtml(companyName)}</div>
        <div class="company-meta">
          ${companyAddress ? `<div>${escapeHtml(companyAddress)}</div>` : ''}
          ${companyPhone ? `<div>Tel: <strong>${escapeHtml(companyPhone)}</strong></div>` : ''}
          ${companyEmail ? `<div>Email: <strong>${escapeHtml(companyEmail)}</strong></div>` : ''}
          ${companyGst ? `<div>GSTIN: <strong>${escapeHtml(companyGst)}</strong></div>` : ''}
        </div>
      </td>
      <td style="width: 40%;" class="logo-box">
        ${logoUrl ? `<img src="${logoUrl}" class="logo-img" alt="Logo" />` : `<div class="logo-placeholder">${escapeHtml(companyName)}</div>`}
      </td>
    </tr>
  </table>

  <div class="doc-title-row">
    <div class="doc-title" style="color: #1E293B;">PURCHASE ORDER</div>
  </div>

  <!-- Billing & Metadata Table -->
  <table class="billing-table">
    <tr>
      <td style="width: 55%;">
        <div class="section-label">VENDOR (TO)</div>
        <div class="party-name">${escapeHtml(order.vendor_name || 'Vendor Supplier')}</div>
        <div class="party-details">
          ${order.notes ? `<div>Notes: ${escapeHtml(order.notes)}</div>` : ''}
        </div>
      </td>
      <td style="width: 45%;">
        <table class="meta-grid">
          <tr>
            <td class="meta-label" style="color: #1E293B;">PO #:</td>
            <td class="meta-value">${escapeHtml(order.order_number)}</td>
          </tr>
          <tr>
            <td class="meta-label" style="color: #1E293B;">PO Date:</td>
            <td class="meta-value">${formatDate(order.created_at)}</td>
          </tr>
          <tr>
            <td class="meta-label" style="color: #1E293B;">Status:</td>
            <td class="meta-value" style="color: #1E293B;">${escapeHtml(order.status || 'Ordered')}</td>
          </tr>
        </table>
      </td>
    </tr>
  </table>

  <!-- Items Table -->
  <table class="items-table">
    <thead>
      <tr style="background-color: #1E293B;">
        <th class="center-col">#</th>
        <th>Product Description</th>
        <th class="num-col">Qty Required</th>
        <th class="num-col">Est. Unit Price</th>
        <th class="num-col">Total Cost</th>
      </tr>
    </thead>
    <tbody>
      ${itemsRows}
    </tbody>
  </table>

  <!-- Summary Container -->
  <div class="summary-container">
    <table class="summary-table">
      <tr class="grand-total-row" style="border-top: 2px solid #1E293B;">
        <td class="summary-label" style="color: #1E293B;">Estimated Total</td>
        <td class="summary-value" style="color: #1E293B;">${formatMoney(orderTotal, currency)}</td>
      </tr>
    </table>
  </div>

  <!-- Authorized Signatory -->
  <table style="width: 100%; margin-top: 30px;">
    <tr>
      <td style="width: 60%;">
        <div class="box-title" style="color: #1E293B;">Instructions for Vendor</div>
        <div style="font-size: 11px; color: #475569;">Please send invoice and delivery notice referencing Purchase Order #${escapeHtml(order.order_number)}.</div>
      </td>
      <td style="width: 40%; text-align: right;">
        <div style="border-bottom: 1px solid #94A3B8; width: 180px; margin-left: auto; height: 40px;"></div>
        <div style="font-size: 11px; font-weight: 700; color: #1E293B; margin-top: 4px;">Authorized Signatory</div>
        <div style="font-size: 10px; color: #64748B;">For ${escapeHtml(companyName)}</div>
      </td>
    </tr>
  </table>

  <!-- Fixed Page Footer Bar -->
  <div class="footer-bar">
    <div>${companyPhone ? `Tel: ${escapeHtml(companyPhone)}` : ''}</div>
    <div>${companyEmail ? `Email: ${escapeHtml(companyEmail)}` : ''}</div>
    <div>${companyWebsite ? `Web: ${escapeHtml(companyWebsite)}` : ''}</div>
  </div>

</body>
</html>
  `;
}
