import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { domToPng } from 'modern-screenshot';
import { KACST_BOOK_BASE64 } from './fonts';
const DEV_SIGNATURE = "programmed by sabry elfeeb | Phone: 01065826742 | Email: sapry.eldeep@gmail.com";

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

export interface ExcelColumn {
  key: string;
  label: string;
  type?: 'number' | 'string' | 'date' | 'formula' | 'currency';
  width?: number;
}

export interface PDFExportOptions {
  title: string;
  companyName?: string;
  companyAddress?: string;
  companyPhone?: string;
  columns: { key: string; label: string; type?: string }[];
  data: any[];
  filename: string;
  summaryColumns?: string[];
}

export interface ExcelExportOptions {
  title: string;
  companyName?: string;
  companyAddress?: string;
  companyPhone?: string;
  columns: ExcelColumn[];
  data: any[];
  filename: string;
  sheetName?: string;
  summaryColumns?: string[]; // Columns to calculate SUM formulas at the bottom
  averageColumns?: string[]; // Columns to calculate AVERAGE formulas at the bottom
}

/**
 * Generates a professional Excel file with proper formatting, formulas, and RTL support.
 */
export const exportCustomExcel = async (options: ExcelExportOptions) => {
  const {
    title,
    companyName = "شركة إنجاز للتجارة والتصنيع",
    columns,
    data,
    filename,
    sheetName = "التقرير المالي",
    summaryColumns = []
  } = options;

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(sheetName, {
    views: [{ rightToLeft: true }]
  });

  // 1. Company Header
  const companyRow = worksheet.addRow([companyName]);
  worksheet.mergeCells(1, 1, 1, columns.length);
  companyRow.getCell(1).font = { size: 16, bold: true, name: 'Arial' };
  companyRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
  companyRow.height = 30;

  // 2. Title
  const titleRow = worksheet.addRow([title]);
  worksheet.mergeCells(2, 1, 2, columns.length);
  titleRow.getCell(1).font = { size: 14, bold: true };
  titleRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
  titleRow.height = 25;

  // 3. Date
  worksheet.addRow([`تاريخ الاستخراج: ${new Date().toLocaleString('ar-EG')}`]);
  worksheet.mergeCells(3, 1, 3, columns.length);
  worksheet.addRow([]);

  // 4. Headers
  const headerRow = worksheet.addRow(columns.map(c => c.label));
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
    cell.alignment = { horizontal: 'center' };
    cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
  });

  // 5. Data Rows
  data.forEach((item) => {
    const rowValues = columns.map(col => item[col.key]);
    const row = worksheet.addRow(rowValues);
    row.eachCell((cell, colIndex) => {
      const colDef = columns[colIndex - 1];
      if (colDef.type === 'number' || colDef.type === 'currency') {
        cell.numFmt = colDef.type === 'currency' ? '#,##0.00 "ج.م"' : '#,##0.00';
      }
      cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
      cell.alignment = { horizontal: colDef.type === 'number' || colDef.type === 'currency' ? 'right' : 'center' };
    });
  });

  // 6. Summary Row with Formulas
  if (summaryColumns.length > 0) {
    const sumRowValues = columns.map(col => {
      if (summaryColumns.includes(col.key)) {
        const colLetter = worksheet.getColumn(columns.indexOf(col) + 1).letter;
        const startRow = 5;
        const endRow = worksheet.lastRow!.number;
        return { formula: `SUM(${colLetter}${startRow}:${colLetter}${endRow})` };
      }
      if (columns.indexOf(col) === 0) return 'الإجمالي النهائي';
      return '';
    });
    const sumRow = worksheet.addRow(sumRowValues);
    sumRow.eachCell((cell) => {
      cell.font = { bold: true };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
      cell.border = { top: { style: 'double' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
    });
  }

  // 7. Auto-fit column widths
  worksheet.columns.forEach(column => {
    let maxLen = 0;
    column.eachCell!({ includeEmpty: true }, cell => {
      const len = cell.value ? cell.value.toString().length : 0;
      if (len > maxLen) maxLen = len;
    });
    column.width = Math.max(12, maxLen + 2);
  });

  // 8. Footer
  worksheet.addRow([]);
  const footer = worksheet.addRow([DEV_SIGNATURE]);
  worksheet.mergeCells(footer.number, 1, footer.number, columns.length);
  footer.getCell(1).font = { size: 9, italic: true };
  footer.getCell(1).alignment = { horizontal: 'center' };

  const buffer = await workbook.xlsx.writeBuffer();
  saveAs(new Blob([buffer]), `${filename}.xlsx`);
};

export interface AccountStatementPDFOptions {
  title?: string;
  companyName?: string;
  companyAddress?: string;
  companyPhone?: string;
  personName: string;
  personType: 'client' | 'supplier';
  personPhone?: string;
  personAddress?: string;
  startDate?: string;
  endDate?: string;
  priorBalance: number;
  periodDebit: number;
  periodCredit: number;
  finalBalance: number;
  filename: string;
  rows: {
    index: number;
    date: string;
    refNumber: string;
    typeLabel: string;
    description: string;
    invoiceTotal: number;
    amountPaid: number;
    remaining: number;
    balanceBefore: number;
    debit: number;
    credit: number;
    balance: number;
    status: string;
  }[];
}

/**
 * Dedicated Account Statement PDF Exporter
 * Generates an identical HTML-rendered vector PDF print document for account statements,
 * matching the unified enterprise branding and typography system.
 */
export const exportAccountStatementPDF = async (options: AccountStatementPDFOptions) => {
  const currentSettings = getStoredSettings();
  const companyName = options.companyName || currentSettings?.companyName || "شركة إنجاز لتجارة وتشغيل الحديد";
  const companyAddress = options.companyAddress || currentSettings?.address || "المنطقة الصناعية - متكامل لتجارة وتشغيل المعادن والحديد";
  const companyPhone = options.companyPhone || currentSettings?.phone || "01065826742";

  const {
    personName,
    personType,
    personPhone = "غير مسجل",
    personAddress = "",
    startDate,
    endDate,
    priorBalance,
    periodDebit,
    periodCredit,
    finalBalance,
    filename,
    rows
  } = options;

  const isClient = personType === 'client';
  const currentDate = new Date().toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });

  // Rows HTML
  const rowsHtml = rows.map((r, idx) => {
    const bg = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
    let dateDisplay = '-';
    if (r.date) {
      const d = new Date(r.date);
      if (!isNaN(d.getTime())) {
        const df = d.toLocaleDateString('ar-EG');
        const tf = d.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', hour12: true });
        dateDisplay = `<div style="font-weight:800; color:#0f172a;">${df}</div><div style="font-size:9px; color:#64748b; font-family:sans-serif;" dir="ltr">${tf}</div>`;
      } else {
        dateDisplay = r.date;
      }
    }

    const typeBadgeColor = r.typeLabel.includes('سداد') || r.typeLabel.includes('قبض') || r.typeLabel.includes('تحصيل')
      ? 'background-color:#ecfdf5; color:#047857; border:1px solid #a7f3d0;'
      : r.typeLabel.includes('تشغيل') || r.typeLabel.includes('ليزر') || r.typeLabel.includes('تناية')
        ? 'background-color:#fef3c7; color:#92400e; border:1px solid #fde68a;'
        : r.typeLabel.includes('افتتاحي') || r.typeLabel.includes('سابق')
          ? 'background-color:#f1f5f9; color:#334155; border:1px solid #cbd5e1;'
          : 'background-color:#eff6ff; color:#1e40af; border:1px solid #bfdbfe;';

    const statusBadgeColor = r.status.includes('مطلوب') || r.status.includes('مدين') || r.status.includes('عليه')
      ? 'background-color:#fff1f2; color:#be123c;'
      : r.status.includes('دائن') || r.status.includes('له')
        ? 'background-color:#ecfdf5; color:#047857;'
        : 'background-color:#f1f5f9; color:#475569;';

    return `
      <tr style="background-color:${bg}; text-align:center; font-size:11px; font-weight:600; color:#0f172a;">
        <td style="padding:8px 6px; border:1px solid #cbd5e1; font-weight:700; color:#64748b; width:35px;">${r.index}</td>
        <td style="padding:8px 6px; border:1px solid #cbd5e1; white-space:nowrap;">${dateDisplay}</td>
        <td style="padding:8px 6px; border:1px solid #cbd5e1; font-family:monospace; font-weight:800; color:#1d4ed8;">${r.refNumber}</td>
        <td style="padding:8px 6px; border:1px solid #cbd5e1; white-space:nowrap;">
          <span style="display:inline-block; padding:2px 6px; border-radius:4px; font-size:10px; font-weight:800; ${typeBadgeColor}">
            ${r.typeLabel}
          </span>
        </td>
        <td style="padding:8px 8px; border:1px solid #cbd5e1; text-align:right; font-weight:700; color:#1e293b;">${r.description}</td>
        <td style="padding:8px 6px; border:1px solid #cbd5e1; font-family:monospace; font-weight:700; color:#1e40af; background-color:#eff6ff/10; white-space:nowrap;">${r.invoiceTotal > 0 ? r.invoiceTotal.toLocaleString() : '-'}</td>
        <td style="padding:8px 6px; border:1px solid #cbd5e1; font-family:monospace; font-weight:700; color:#047857; background-color:#ecfdf5/10; white-space:nowrap;">${r.amountPaid > 0 ? r.amountPaid.toLocaleString() : '-'}</td>
        <td style="padding:8px 6px; border:1px solid #cbd5e1; font-family:monospace; font-weight:700; color:#be123c; background-color:#fff1f2/10; white-space:nowrap;">${r.remaining > 0 ? r.remaining.toLocaleString() : '-'}</td>
        <td style="padding:8px 6px; border:1px solid #cbd5e1; font-family:monospace; color:#be123c; font-weight:800; background-color:#fff1f2/20; white-space:nowrap;">${r.debit > 0 ? r.debit.toLocaleString() + ' ج.م' : '-'}</td>
        <td style="padding:8px 6px; border:1px solid #cbd5e1; font-family:monospace; color:#047857; font-weight:800; background-color:#ecfdf5/20; white-space:nowrap;">${r.credit > 0 ? r.credit.toLocaleString() + ' ج.م' : '-'}</td>
        <td style="padding:8px 8px; border:1px solid #cbd5e1; font-family:monospace; font-weight:900; color:#0f172a; background-color:#fef3c7; white-space:nowrap;">${Math.abs(r.balance).toLocaleString()} ج.م</td>
        <td style="padding:8px 6px; border:1px solid #cbd5e1; white-space:nowrap;">
          <span style="display:inline-block; padding:2px 6px; border-radius:4px; font-size:10px; font-weight:800; ${statusBadgeColor}">
            ${r.status}
          </span>
        </td>
      </tr>
    `;
  }).join('');

  const documentHtml = `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
      <head>
        <meta charset="utf-8">
        <title>${filename}</title>
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
            padding-bottom: 14px;
            margin-bottom: 16px;
          }
          .company-title { font-size: 20px; font-weight: 900; color: #0f172a; margin: 0; }
          .company-sub { font-size: 11px; font-weight: 700; color: #475569; margin-top: 3px; }
          .doc-type-badge {
            background-color: #0f172a;
            color: #ffffff;
            padding: 6px 14px;
            border-radius: 8px;
            font-size: 13px;
            font-weight: 900;
            display: inline-block;
            text-align: center;
          }
          .party-card {
            background-color: #f8fafc;
            border: 1px solid #cbd5e1;
            border-radius: 12px;
            padding: 12px 16px;
            margin-bottom: 16px;
          }
          .party-title { font-size: 13px; font-weight: 900; color: #0f172a; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; margin-bottom: 8px; }
          .party-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            row-gap: 6px;
            column-gap: 20px;
            font-size: 11px;
            font-weight: 700;
          }
          .party-row { display: flex; justify-content: space-between; border-bottom: 1px dashed #e2e8f0; padding-bottom: 3px; }
          .party-label { color: #64748b; }
          .party-val { color: #0f172a; font-weight: 800; }
          .stats-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 10px;
            margin-bottom: 16px;
          }
          .stat-card {
            border: 1px solid #cbd5e1;
            border-radius: 10px;
            padding: 10px 8px;
            text-align: center;
            background-color: #f8fafc;
          }
          .stat-label { font-size: 10px; font-weight: 800; color: #64748b; display: block; }
          .stat-val { font-size: 15px; font-weight: 900; font-family: monospace; margin-top: 3px; display: block; }
          .report-table { width: 100%; border-collapse: collapse; margin-bottom: 16px; border: 1px solid #cbd5e1; }
          .report-table th {
            padding: 9px 6px;
            background-color: #f1f5f9;
            color: #0f172a;
            font-weight: 900;
            font-size: 11px;
            border: 1px solid #cbd5e1;
            text-align: center;
          }
          .report-table th.debit-th { background-color: #ffe4e6; color: #881337; }
          .report-table th.credit-th { background-color: #d1fae5; color: #064e3b; }
          .report-table th.balance-th { background-color: #fef3c7; color: #78350f; }
          .summary-banner {
            background-color: #f8fafc;
            border: 1px solid #cbd5e1;
            border-radius: 12px;
            padding: 12px 14px;
            margin-bottom: 20px;
            font-size: 12px;
            font-weight: 800;
            line-height: 1.6;
          }
          .signatures-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 20px;
            margin-top: 24px;
            padding-top: 14px;
            border-top: 2px solid #0f172a;
            text-align: center;
            font-size: 11px;
            font-weight: 800;
          }
          .sig-line {
            border-bottom: 1px dashed #94a3b8;
            margin: 28px auto 4px auto;
            width: 75%;
          }
          .footer-box {
            margin-top: 24px;
            padding-top: 10px;
            border-top: 1px solid #cbd5e1;
            text-align: center;
            font-size: 10px;
            font-weight: 700;
            color: #64748b;
          }
          @page { size: A4 portrait; margin: 10mm; }
          @media print {
            body { padding: 0; }
            .no-print { display: none !important; }
          }
        </style>
      </head>
      <body>
        <div class="header-box">
          <div>
            <h1 class="company-title">${companyName}</h1>
            <div class="company-sub">${companyAddress}</div>
            <div class="company-sub">هاتف: ${companyPhone}</div>
          </div>
          <div style="text-align:left;">
            <div class="doc-type-badge">كشف حساب مالي تفصيلي</div>
            <div style="font-size:11px; font-weight:800; color:#0f172a; margin-top:6px;">تاريخ الاستخراج: ${currentDate}</div>
          </div>
        </div>

        <div class="party-card">
          <div class="party-title">بيانات الحساب والطرف الثاني (${isClient ? 'العميل' : 'المورد'})</div>
          <div class="party-grid">
            <div class="party-row">
              <span class="party-label">الاسم:</span>
              <span class="party-val">${personName}</span>
            </div>
            <div class="party-row">
              <span class="party-label">نوع الحساب:</span>
              <span class="party-val">${isClient ? 'حساب عميل (مبيعات وتشغيل)' : 'حساب مورد (مشتريات وخامات)'}</span>
            </div>
            <div class="party-row">
              <span class="party-label">رقم الهاتف:</span>
              <span class="party-val">${personPhone}</span>
            </div>
            <div class="party-row">
              <span class="party-label">فترة الكشف:</span>
              <span class="party-val">${startDate ? new Date(startDate).toLocaleDateString('ar-EG') : 'بداية التعامل'} حتى ${endDate ? new Date(endDate).toLocaleDateString('ar-EG') : 'تاريخه'}</span>
            </div>
          </div>
        </div>

        <div class="stats-grid">
          <div class="stat-card">
            <span class="stat-label">الرصيد السابق قبل الفترة</span>
            <span class="stat-val" style="color:#334155;">${Math.abs(priorBalance).toLocaleString()} ج.م</span>
            <span style="font-size:9px; font-weight:800; color:#64748b;">${priorBalance > 0 ? (isClient ? '(عليه)' : '(له)') : priorBalance < 0 ? (isClient ? '(له)' : '(عليه)') : '(خالص)'}</span>
          </div>
          <div class="stat-card" style="background-color:#fff1f2; border-color:#fecdd3;">
            <span class="stat-label" style="color:#9f1239;">إجمالي المدين (+)</span>
            <span class="stat-val" style="color:#be123c;">${periodDebit.toLocaleString()} ج.م</span>
            <span style="font-size:9px; font-weight:800; color:#be123c;">فواتير ومسحوبات</span>
          </div>
          <div class="stat-card" style="background-color:#ecfdf5; border-color:#a7f3d0;">
            <span class="stat-label" style="color:#065f46;">إجمالي الدائن (-)</span>
            <span class="stat-val" style="color:#047857;">${periodCredit.toLocaleString()} ج.م</span>
            <span style="font-size:9px; font-weight:800; color:#047857;">تحصيل وسدادات</span>
          </div>
          <div class="stat-card" style="background-color:#fef3c7; border-color:#fde68a;">
            <span class="stat-label" style="color:#78350f;">الرصيد الصافي المتبقي</span>
            <span class="stat-val" style="color:#92400e;">${Math.abs(finalBalance).toLocaleString()} ج.م</span>
            <span style="font-size:9px; font-weight:900; color:#92400e;">${finalBalance > 0 ? (isClient ? 'مدين (مطلوب منه)' : 'دائن (مستحق له)') : finalBalance < 0 ? (isClient ? 'دائن (له)' : 'مدين (مطلوب منه)') : 'مصفى 100%'}</span>
          </div>
        </div>

        <table class="report-table">
          <thead>
            <tr>
              <th style="width:35px;">م</th>
              <th style="width:90px;">التاريخ</th>
              <th style="width:85px;">المرجع</th>
              <th style="width:105px;">نوع الحركة</th>
              <th>البيان والتفاصيل</th>
              <th style="width:70px;">إجمالي الفاتورة</th>
              <th style="width:70px;">المسدد</th>
              <th style="width:70px;">المتبقي</th>
              <th style="width:85px;" class="debit-th">مدين (+)</th>
              <th style="width:85px;" class="credit-th">دائن (-)</th>
              <th style="width:95px;" class="balance-th">الرصيد بعدها</th>
              <th style="width:80px;">الموقف</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
          <tfoot>
            <tr style="background-color:#f1f5f9; font-weight:900; font-size:11px; color:#0f172a; text-align:center;">
              <td colspan="5" style="padding:10px 8px; border:2px solid #cbd5e1; text-align:right;">إجمالي حركات الفترة المحددة ورصيد التصفية:</td>
              <td style="padding:10px 6px; border:2px solid #cbd5e1; font-family:monospace; color:#1e40af;">-</td>
              <td style="padding:10px 6px; border:2px solid #cbd5e1; font-family:monospace; color:#047857;">-</td>
              <td style="padding:10px 6px; border:2px solid #cbd5e1; font-family:monospace; color:#be123c;">-</td>
              <td style="padding:10px 6px; border:2px solid #cbd5e1; font-family:monospace; color:#be123c;">${periodDebit.toLocaleString()} ج.م</td>
              <td style="padding:10px 6px; border:2px solid #cbd5e1; font-family:monospace; color:#047857;">${periodCredit.toLocaleString()} ج.م</td>
              <td colspan="2" style="padding:10px 8px; border:2px solid #cbd5e1; font-family:monospace; background-color:#fef3c7; color:#78350f; font-weight:900;">${Math.abs(finalBalance).toLocaleString()} ج.م (${finalBalance > 0 ? (isClient ? 'مطلوب منه' : 'مستحق له') : finalBalance < 0 ? (isClient ? 'له دائن' : 'مطلوب منه') : 'مصفى'})</td>
            </tr>
          </tfoot>
        </table>

        <div class="summary-banner">
          📌 <strong>خلاصة وتصفية الموقف المالي:</strong> الطرف (${personName} - ${isClient ? 'عميل' : 'مورد'}) — 
          ${finalBalance > 0 
            ? (isClient ? `مدين للمحل بمبلغ إجمالي قدره (${Math.abs(finalBalance).toLocaleString()} ج.م) واجب السداد.` : `دائن للمحل بمبلغ إجمالي قدره (${Math.abs(finalBalance).toLocaleString()} ج.م) مستحق له.`)
            : finalBalance < 0
              ? (isClient ? `دائن للمحل بمبلغ إجمالي قدره (${Math.abs(finalBalance).toLocaleString()} ج.م) كدفعة مقدمة.` : `مدين للمحل بمبلغ إجمالي قدره (${Math.abs(finalBalance).toLocaleString()} ج.م).`)
              : `الحساب خالص ومصفى بالكامل بنسبة 100%.`
          }
        </div>

        <div class="signatures-grid">
          <div>
            <div>إعداد ومراجعة الحسابات</div>
            <div class="sig-line"></div>
            <div style="font-size:9px; color:#64748b;">المحاسب المسؤول</div>
          </div>
          <div>
            <div>توقيع واعتماد ${isClient ? 'العميل' : 'المورد'}</div>
            <div class="sig-line"></div>
            <div style="font-size:9px; color:#64748b;">بالاستلام وصحة الرصيد</div>
          </div>
          <div>
            <div>اعتماد الإدارة والختم</div>
            <div class="sig-line"></div>
            <div style="font-size:9px; color:#64748b;">إدارة المخازن والتشغيل</div>
          </div>
        </div>

        <div class="footer-box">
          programmed by sabry elfeeb | Phone: 01065826742 | Email: sapry.eldeep@gmail.com
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
      printWin.document.write(documentHtml);
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
  container.innerHTML = documentHtml;
  window.print();
};

/**
 * Professional Data-Driven PDF Export & Printing Engine
 * Generates pristine A4 PDF documents with full Arabic RTL support, company branding,
 * formatted tables, totals, and mandatory programmer copyright footer.
 */
export const exportDataToPDF = async (options: PDFExportOptions) => {
  const currentSettings = getStoredSettings();
  const companyName = options.companyName || currentSettings?.companyName || "شركة إنجاز لتجارة وتشغيل الحديد";
  const companyAddress = options.companyAddress || currentSettings?.address || "المنطقة الصناعية - متكامل لتجارة وتشغيل المعادن والحديد";
  const companyPhone = options.companyPhone || currentSettings?.phone || "01065826742";

  const {
    title,
    columns,
    data,
    filename,
    summaryColumns = []
  } = options;

  // Compute column totals if applicable
  const totals: Record<string, number> = {};
  if (summaryColumns.length > 0) {
    summaryColumns.forEach(key => {
      totals[key] = data.reduce((acc, curr) => acc + (Number(curr[key]) || 0), 0);
    });
  }

  // Build clean HTML table
  const headersHtml = columns.map(c => `<th style="padding:10px 12px; background-color:#e2e8f0; color:#0f172a; font-weight:800; border:1px solid #cbd5e1; font-size:12px; text-align:center;">${c.label}</th>`).join('');
  
  const rowsHtml = data.map((item, index) => {
    const bg = index % 2 === 0 ? '#ffffff' : '#f8fafc';
    const cells = columns.map(col => {
      const val = item[col.key];
      let displayVal = val !== undefined && val !== null ? String(val) : '';
      let textAlign = 'right';

      if (col.type === 'number') {
        const num = Number(val);
        displayVal = isNaN(num) ? '0' : num.toLocaleString();
        textAlign = 'center';
      } else if (col.type === 'date') {
        displayVal = val ? new Date(val).toLocaleDateString('ar-EG') : '';
        textAlign = 'center';
      }

      return `<td style="padding:8px 12px; border:1px solid #cbd5e1; font-size:11px; text-align:${textAlign}; font-weight:600; color:#0f172a;">${displayVal}</td>`;
    }).join('');

    return `<tr style="background-color:${bg};">${cells}</tr>`;
  }).join('');

  // Build Summary Row (Light clean theme - no dark/black bars)
  let summaryHtml = '';
  if (summaryColumns.length > 0 && data.length > 0) {
    const summaryCells = columns.map((col, idx) => {
      if (idx === 0) {
        return `<td style="padding:10px 12px; border:2px solid #cbd5e1; background-color:#e2e8f0; color:#0f172a; font-weight:900; font-size:12px; text-align:center;">الإجمالي العام</td>`;
      }
      if (summaryColumns.includes(col.key)) {
        const totalVal = totals[col.key] || 0;
        return `<td style="padding:10px 12px; border:2px solid #cbd5e1; background-color:#f1f5f9; color:#0369a1; font-weight:900; font-size:13px; text-align:center; font-family:monospace;">${totalVal.toLocaleString()}</td>`;
      }
      return `<td style="padding:10px 12px; border:2px solid #cbd5e1; background-color:#f1f5f9;"></td>`;
    }).join('');

    summaryHtml = `<tfoot><tr>${summaryCells}</tr></tfoot>`;
  }

  const currentDate = new Date().toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });

  const documentHtml = `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
      <head>
        <meta charset="utf-8">
        <title>${filename}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap');
          * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          body {
            font-family: 'Cairo', system-ui, -apple-system, sans-serif;
            background-color: #ffffff;
            color: #0f172a;
            margin: 0;
            padding: 15mm;
            direction: rtl;
          }
          .header-box {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 3px solid #1e3a8a;
            padding-bottom: 16px;
            margin-bottom: 20px;
          }
          .company-title { font-size: 20px; font-weight: 900; color: #1e3a8a; margin: 0; }
          .report-title { font-size: 16px; font-weight: 800; color: #0f172a; margin-top: 6px; }
          .meta-box { text-align: left; font-size: 11px; font-weight: 700; color: #64748b; }
          .report-table { width: 100%; border-collapse: collapse; margin-top: 15px; }
          .footer-box {
            margin-top: 40px;
            padding-top: 15px;
            border-top: 1px solid #cbd5e1;
            text-align: center;
            font-size: 10px;
            font-weight: 700;
            color: #64748b;
          }
          @page { size: A4 portrait; margin: 10mm; }
          @media print {
            body { padding: 0; }
            .no-print { display: none !important; }
          }
        </style>
      </head>
      <body>
        <div class="header-box">
          <div>
            <h1 class="company-title">${companyName}</h1>
            <div style="font-size:11px; font-weight:700; color:#475569; margin-top:3px;">${companyAddress}</div>
            <div style="font-size:11px; font-weight:700; color:#475569;">هاتف: ${companyPhone}</div>
            <div class="report-title">${title}</div>
          </div>
          <div class="meta-box">
            <div>تاريخ التقرير: ${currentDate}</div>
            <div>عدد السجلات: ${data.length}</div>
          </div>
        </div>

        <table class="report-table">
          <thead>
            <tr>${headersHtml}</tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
          ${summaryHtml}
        </table>

        <div class="footer-box">
          programmed by sabry elfeeb | Phone: 01065826742 | Email: sapry.eldeep@gmail.com
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

  // Open direct print / PDF save window
  try {
    const printWin = window.open('', '_blank', 'width=1000,height=900,scrollbars=yes');
    if (printWin) {
      printWin.document.open();
      printWin.document.write(documentHtml);
      printWin.document.close();
      return;
    }
  } catch (e) {
    console.warn('PDF window blocked, writing to fallback container:', e);
  }

  // Fallback if popup blocked
  let container = document.getElementById('pdf-export-fallback-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'pdf-export-fallback-container';
    document.body.appendChild(container);
  }
  container.innerHTML = documentHtml;
  window.print();
};

/**
 * Exports a DOM element directly to a PDF file using high-resolution screenshot + jsPDF
 */
export const exportToPDF = async (element: HTMLElement, filename: string) => {
  try {
    const imgData = await domToPng(element, {
      quality: 0.98,
      scale: 2,
      backgroundColor: '#ffffff',
      filter: (node) => !(node instanceof HTMLElement && node.classList.contains('no-print')),
    });
    
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true
    });
    
    const img = new Image();
    img.src = imgData;
    
    await new Promise((resolve) => { img.onload = resolve; });

    const imgWidth = 210; 
    const pageHeight = 297;
    const imgHeight = (img.height * imgWidth) / img.width;
    
    let heightLeft = imgHeight;
    let position = 0;
    
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
    heightLeft -= pageHeight;
    
    while (heightLeft >= 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
      heightLeft -= pageHeight;
    }
    
    pdf.save(`${filename}.pdf`);
  } catch (error) {
    console.error('PDF Export Error:', error);
    // Fallback to HTML data PDF
    alert('جار تحويل المستند إلى تنسيق PDF جاهز للتحميل والطباعة...');
    const textContent = element.innerText;
    exportDataToPDF({
      title: filename,
      filename,
      columns: [{ key: 'content', label: 'المحتوى' }],
      data: [{ content: textContent }]
    });
  }
};

/**
 * Standard simple exporter wrapper for backwards compatibility
 */
export const exportToExcel = (data: any[], filename: string) => {
  if (data.length === 0) return;
  const keys = Object.keys(data[0]);
  const columns: ExcelColumn[] = keys.map(k => ({
    key: k,
    label: k,
    type: typeof data[0][k] === 'number' ? 'number' : 'string'
  }));

  exportCustomExcel({
    title: filename,
    columns,
    data,
    filename,
    summaryColumns: columns.filter(c => c.type === 'number').map(c => c.key)
  });
};
