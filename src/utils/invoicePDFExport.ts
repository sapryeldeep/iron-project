import { Invoice, Person, AppSettings } from '../types';

const getStoredSettings = () => {
  try {
    const raw = localStorage.getItem('steel-warehouse-data');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.settings) return parsed.settings;
    }
  } catch (e) {}
  return {};
};

export interface InvoicePDFOptions {
  invoice: Invoice;
  person?: Person;
  settings?: AppSettings;
  filename?: string;
  notes?: string;
}

const PROGRAMMER_FOOTER = "programmed by sabry elfeeb | Phone: 01065826742 | Email: sapry.eldeep@gmail.com";

/**
 * Generates an identical HTML-rendered vector PDF print document for invoices,
 * matching InvoicePrintTemplate exactly (header, customer box, items table, mini statement, signatures, footer).
 */
export const exportInvoiceToVectorPDF = async (options: InvoicePDFOptions) => {
  const { invoice, person, settings, filename, notes } = options;
  const currentSettings = getStoredSettings();
  const isSales = invoice.type === 'sales';
  const companyName = settings?.companyName || currentSettings?.companyName || 'شركة إنجاز لتجارة وتشغيل الحديد';
  const companyPhone = settings?.phone || currentSettings?.phone || '01065826742';
  const companyAddress = settings?.address || currentSettings?.address || 'المنطقة الصناعية - متكامل لتجارة وتشغيل المعادن والحديد';
  const taxNumber = settings?.taxNumber || currentSettings?.taxNumber || '';
  const notesText = notes || settings?.invoiceNotes || currentSettings?.invoiceNotes || '';

  // Financial calculations
  const remainingAmount = invoice.remainingAmount || 0;
  const currentBalance = person?.balance || 0;
  const invoiceEffect = isSales ? remainingAmount : -remainingAmount;
  const previousBalance = currentBalance - invoiceEffect;
  const newBalance = currentBalance;

  const invoiceDateStr = (() => {
    if (!invoice.createdAt && !invoice.date) return '-';
    const d = new Date(invoice.createdAt || invoice.date);
    if (isNaN(d.getTime())) return invoice.createdAt || invoice.date;
    const df = d.toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });
    const tf = d.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', hour12: true });
    return `${df} - ${tf}`;
  })();

  const itemsRowsHtml = invoice.items.map((item, idx) => {
    const bg = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
    let extraInfo = '';
    if (invoice.category === 'laser' && item.length) {
      extraInfo = `<div style="font-size:10px; color:#64748b; font-weight:normal; margin-top:2px;">(الأبعاد: ${item.length}م × ${item.width}م × سمك ${item.thickness}مم)</div>`;
    } else if (invoice.category === 'bending' && item.bendsCount) {
      extraInfo = `<div style="font-size:10px; color:#64748b; font-weight:normal; margin-top:2px;">(إجمالي عدد طعجات التناية: ${item.bendsCount})</div>`;
    }

    const unitLabel = 
      item.manufacturingUnit === 'meter' ? 'متر' : 
      item.manufacturingUnit === 'piece' ? 'قطعة' : 
      item.manufacturingUnit === 'ton' ? 'طن' : 
      item.manufacturingUnit === 'bend' ? 'ثنية' : 
      item.manufacturingUnit === 'hour' ? 'ساعة' : 'كجم';

    return `
      <tr style="background-color:${bg};">
        <td style="padding:10px; text-align:center; color:#64748b; font-weight:700; border:1px solid #cbd5e1; width:40px;">${idx + 1}</td>
        <td style="padding:10px; font-weight:800; color:#0f172a; border:1px solid #cbd5e1; text-align:right;">
          ${item.description}
          ${extraInfo}
        </td>
        <td style="padding:10px; text-align:center; font-family:monospace; font-weight:800; color:#334155; border:1px solid #cbd5e1; white-space:nowrap;">
          ${item.quantity.toLocaleString()} ${unitLabel}
        </td>
        <td style="padding:10px; text-align:center; font-family:monospace; font-weight:800; color:#334155; border:1px solid #cbd5e1;">
          ${item.unitPrice.toLocaleString()}
        </td>
        <td style="padding:10px; text-align:center; font-family:monospace; font-weight:900; color:#0f172a; border:1px solid #cbd5e1; background-color:#f1f5f9;">
          ${item.total.toLocaleString()}
        </td>
      </tr>
    `;
  }).join('');

  const typeName = invoice.type === 'sales' ? 'فاتورة مبيعات' : invoice.type === 'sales_return' ? 'مرتجع مبيعات' : invoice.type === 'purchase_return' ? 'مرتجع مشتريات' : 'فاتورة مشتريات';
  const categoryLabel = invoice.category === 'manufacturing' ? 'تصنيع وتشغيل' : invoice.category === 'laser' ? 'تشغيل ليزر' : invoice.category === 'bending' ? 'شغل تناية' : invoice.category === 'strip' ? 'تفصيل خوصة' : 'عام';

  const docHtml = `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
      <head>
        <meta charset="utf-8">
        <title>${filename || `فاتورة_${invoice.invoiceNumber}`}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap');
          * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          body {
            font-family: 'Cairo', system-ui, -apple-system, sans-serif;
            background-color: #ffffff;
            color: #0f172a;
            margin: 0;
            padding: 12mm 15mm;
            direction: rtl;
          }
          .header-box {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 2px solid #0f172a;
            padding-bottom: 16px;
            margin-bottom: 18px;
          }
          .brand-box { display: flex; flex-direction: column; gap: 4px; }
          .logo-title {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 22px;
            font-weight: 900;
            color: #0f172a;
          }
          .logo-badge {
            width: 32px;
            height: 32px;
            background-color: #0f172a;
            color: #ffffff;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 900;
            font-size: 16px;
          }
          .company-info { font-size: 11px; font-weight: 700; color: #475569; }
          .invoice-type-box { text-align: left; }
          .invoice-type-title {
            font-size: 22px;
            font-weight: 900;
            color: #0f172a;
            border-bottom: 3px solid #059669;
            display: inline-block;
            padding-bottom: 3px;
          }
          .invoice-meta { font-size: 12px; font-weight: 800; color: #1e293b; margin-top: 6px; }
          .client-box {
            background-color: #f8fafc;
            border: 1px solid #cbd5e1;
            border-radius: 12px;
            padding: 12px 16px;
            margin-bottom: 18px;
          }
          .client-title { font-size: 14px; font-weight: 900; color: #0f172a; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; margin-bottom: 10px; }
          .client-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            row-gap: 8px;
            column-gap: 24px;
            font-size: 12px;
            font-weight: 700;
          }
          .client-row { display: flex; justify-content: space-between; border-bottom: 1px dashed #e2e8f0; padding-bottom: 4px; }
          .client-label { color: #64748b; }
          .client-val { color: #0f172a; font-weight: 800; }
          .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 18px;
            border: 1px solid #cbd5e1;
          }
          .items-table th {
            padding: 10px;
            background-color: #f1f5f9;
            color: #0f172a;
            font-weight: 900;
            font-size: 12px;
            border: 1px solid #cbd5e1;
            text-align: center;
          }
          .summary-container {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
            align-items: flex-start;
            margin-bottom: 18px;
          }
          .mini-statement-box {
            background-color: #f8fafc;
            border: 1px solid #cbd5e1;
            border-radius: 12px;
            padding: 12px 14px;
          }
          .mini-title {
            font-size: 12px;
            font-weight: 900;
            color: #0f172a;
            border-bottom: 1px solid #e2e8f0;
            padding-bottom: 6px;
            margin-bottom: 8px;
            display: flex;
            align-items: center;
            gap: 6px;
          }
          .mini-dot { width: 8px; height: 8px; border-radius: 50%; background-color: #2563eb; display: inline-block; }
          .mini-row {
            display: flex;
            justify-content: space-between;
            font-size: 11px;
            font-weight: 700;
            color: #334155;
            padding: 3px 0;
          }
          .mini-row.total-row {
            border-top: 1px solid #cbd5e1;
            margin-top: 6px;
            padding-top: 6px;
            font-size: 12px;
            font-weight: 900;
            color: #0f172a;
          }
          .invoice-subtotals-box {
            background-color: #f8fafc;
            border: 1px solid #cbd5e1;
            border-radius: 12px;
            overflow: hidden;
          }
          .subtotal-row {
            display: flex;
            justify-content: space-between;
            padding: 8px 12px;
            font-size: 12px;
            font-weight: 800;
            border-bottom: 1px solid #e2e8f0;
          }
          .total-net-row {
            display: flex;
            justify-content: space-between;
            padding: 10px 12px;
            font-size: 14px;
            font-weight: 900;
            background-color: #ecfdf5;
            color: #064e3b;
            border-bottom: 2px solid #0f172a;
          }
          .paid-row {
            display: flex;
            justify-content: space-between;
            padding: 8px 12px;
            font-size: 12px;
            font-weight: 800;
            color: #047857;
            background-color: #ffffff;
            border-bottom: 1px solid #e2e8f0;
          }
          .remaining-row {
            display: flex;
            justify-content: space-between;
            padding: 8px 12px;
            font-size: 12px;
            font-weight: 900;
            color: #be123c;
            background-color: #ffffff;
          }
          .notes-box {
            margin-top: 14px;
            padding-top: 10px;
            border-top: 1px solid #e2e8f0;
            font-size: 11px;
            font-weight: 600;
            color: #475569;
          }
          .signatures-grid {
            display: flex;
            justify-content: space-between;
            margin-top: 24px;
            padding-top: 16px;
            border-top: 1px solid #cbd5e1;
            text-align: center;
          }
          .sig-col { text-align: center; }
          .sig-title { font-size: 11px; font-weight: 800; color: #334155; margin-bottom: 30px; }
          .sig-line { width: 140px; border-bottom: 1px dashed #94a3b8; }
          .footer-box {
            margin-top: 24px;
            padding-top: 10px;
            border-top: 1px solid #cbd5e1;
            text-align: center;
            font-size: 10px;
            font-weight: 700;
            color: #64748b;
            font-family: monospace;
          }
          @page { size: A4 portrait; margin: 8mm; }
          @media print {
            body { padding: 0; }
            .no-print { display: none !important; }
          }
        </style>
      </head>
      <body>
        <!-- Header -->
        <div class="header-box">
          <div class="brand-box">
            <div class="logo-title">
              <div class="logo-badge">إ</div>
              <span>${companyName}</span>
            </div>
            <div class="company-info">${companyAddress}</div>
            <div class="company-info">هاتف: <span dir="ltr">${companyPhone}</span> ${taxNumber ? `| الرقم الضريبي: ${taxNumber}` : ''}</div>
          </div>
          <div class="invoice-type-box">
            <div class="invoice-type-title">${typeName}</div>
            <div class="invoice-meta">رقم المستند: #${invoice.invoiceNumber}</div>
            <div class="invoice-meta" style="font-weight:700; font-size:11px; color:#475569;">التاريخ: ${invoiceDateStr}</div>
            ${invoice.category !== 'general' ? `<div style="font-size:10px; background-color:#f1f5f9; padding:2px 8px; border-radius:12px; display:inline-block; font-weight:800; margin-top:4px; border:1px solid #cbd5e1;">القسم: ${categoryLabel}</div>` : ''}
          </div>
        </div>

        <!-- Customer Box -->
        <div class="client-box">
          <div class="client-title">تفاصيل الحساب للطرف ${isSales ? 'المستلم' : 'المورد'}</div>
          <div class="client-grid">
            <div class="client-row">
              <span class="client-label">الاسم التجاري:</span>
              <span class="client-val" style="font-size:13px;">${person?.name || 'نقدي / عام'}</span>
            </div>
            <div class="client-row">
              <span class="client-label">الهاتف:</span>
              <span class="client-val" dir="ltr">${person?.phone || 'غير مسجل'}</span>
            </div>
            <div class="client-row">
              <span class="client-label">العنوان:</span>
              <span class="client-val">${person?.address || 'غير مسجل'}</span>
            </div>
            <div class="client-row">
              <span class="client-label">الرصيد المالي الحالي:</span>
              <span class="client-val" style="color:${currentBalance > 0 ? '#be123c' : currentBalance < 0 ? '#047857' : '#0f172a'};" dir="ltr">
                ${Math.abs(currentBalance).toLocaleString()} ج.م ${currentBalance > 0 ? '(عليه)' : currentBalance < 0 ? '(له)' : 'مخلص'}
              </span>
            </div>
          </div>
        </div>

        <!-- Items Table -->
        <table class="items-table">
          <thead>
            <tr>
              <th style="width:40px;">م</th>
              <th>الصنف / بيان خامات الحديد والتشغيل</th>
              <th style="width:130px;">${invoice.category === 'laser' ? 'الوزن (كجم)' : 'الكمية / الوزن'}</th>
              <th style="width:110px;">سعر الوحدة</th>
              <th style="width:120px;">الإجمالي</th>
            </tr>
          </thead>
          <tbody>
            ${itemsRowsHtml}
          </tbody>
        </table>

        <!-- Summary: Mini Ledger + Subtotals -->
        <div class="summary-container">
          <!-- Mini Ledger -->
          ${person ? `
            <div class="mini-statement-box">
              <div class="mini-title">
                <span class="mini-dot"></span>
                كشف حساب مالي مدمج للعميل
              </div>
              <div class="mini-row">
                <span>رصيد العميل السابق قبل الفاتورة:</span>
                <span style="font-family:monospace; font-weight:800;">
                  ${Math.abs(previousBalance).toLocaleString()} ج.م ${previousBalance > 0 ? '(مدين)' : previousBalance < 0 ? '(دائن)' : 'مخلص'}
                </span>
              </div>
              <div class="mini-row">
                <span>قيمة المبيعات / المشتريات الحالية:</span>
                <span style="font-family:monospace; font-weight:800;">${invoice.total.toLocaleString()} ج.م</span>
              </div>
              <div class="mini-row">
                <span>المسدد نقداً في الخزينة:</span>
                <span style="font-family:monospace; font-weight:800; color:#047857;">${invoice.paidAmount.toLocaleString()} ج.م</span>
              </div>
              <div class="mini-row total-row">
                <span>رصيد العميل النهائي الجديد:</span>
                <span style="font-family:monospace; font-weight:900; color:${newBalance > 0 ? '#be123c' : newBalance < 0 ? '#047857' : '#0f172a'};">
                  ${Math.abs(newBalance).toLocaleString()} ج.م ${newBalance > 0 ? '(عليه مديونية)' : newBalance < 0 ? '(له رصيد)' : 'مخلص'}
                </span>
              </div>
            </div>
          ` : `<div></div>`}

          <!-- Subtotals Breakdown -->
          <div class="invoice-subtotals-box">
            <div class="subtotal-row">
              <span style="color:#64748b;">الإجمالي الفرعي للفاتورة:</span>
              <span style="font-family:monospace;">${invoice.subtotal.toLocaleString()} ج.م</span>
            </div>
            ${invoice.discount > 0 ? `
              <div class="subtotal-row" style="color:#be123c;">
                <span>الخصم المسموح به:</span>
                <span style="font-family:monospace;">-${invoice.discount.toLocaleString()} ج.م</span>
              </div>
            ` : ''}
            <div class="total-net-row">
              <span>إجمالي الفاتورة الصافي:</span>
              <span style="font-family:monospace;">${invoice.total.toLocaleString()} ج.م</span>
            </div>
            <div class="paid-row">
              <span>المدفوع من الفاتورة:</span>
              <span style="font-family:monospace;">${invoice.paidAmount.toLocaleString()} ج.م</span>
            </div>
            <div class="remaining-row">
              <span>المتبقي من الفاتورة:</span>
              <span style="font-family:monospace;">${invoice.remainingAmount.toLocaleString()} ج.م</span>
            </div>
          </div>
        </div>

        <!-- Notes -->
        ${notesText ? `
          <div class="notes-box">
            <strong>ملاحظات وشروط الفاتورة:</strong>
            <div>${notesText}</div>
          </div>
        ` : ''}

        <!-- Signatures -->
        <div class="signatures-grid">
          <div class="sig-col">
            <div class="sig-title">توقيع المستلم المعتمد</div>
            <div class="sig-line"></div>
          </div>
          <div class="sig-col">
            <div class="sig-title">مسؤول الخزينة</div>
            <div class="sig-line"></div>
          </div>
          <div class="sig-col">
            <div class="sig-title">الختم والتوقيع الإداري</div>
            <div class="sig-line"></div>
          </div>
        </div>

        <!-- Footer -->
        <div class="footer-box">
          ${PROGRAMMER_FOOTER}
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.focus();
              window.print();
            }, 300);
          };
        </script>
      </body>
    </html>
  `;

  try {
    const printWin = window.open('', '_blank', 'width=1000,height=900,scrollbars=yes');
    if (printWin) {
      printWin.document.open();
      printWin.document.write(docHtml);
      printWin.document.close();
      return;
    }
  } catch (e) {
    console.warn('Popup blocked, using fallback container:', e);
  }

  let container = document.getElementById('pdf-export-fallback-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'pdf-export-fallback-container';
    document.body.appendChild(container);
  }
  container.innerHTML = docHtml;
  window.print();
};
