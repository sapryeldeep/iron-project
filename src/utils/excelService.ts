import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

export interface ExcelColumn {
  key: string;
  label: string;
  width?: number;
  type?: 'number' | 'string' | 'date' | 'currency';
}

export interface ExcelExportOptions {
  title: string;
  filename: string;
  columns: ExcelColumn[];
  data: any[];
  summaryRows?: { [key: string]: string | number }[];
  companyName?: string;
}

export const exportToExcel = async (options: ExcelExportOptions) => {
  const { title, filename, columns, data, summaryRows, companyName = "شركة إنجاز للتجارة والتصنيع" } = options;

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Sheet1', {
    views: [{ rightToLeft: true }]
  });

  // 1. Add Company Name Header
  const companyRow = worksheet.addRow([companyName]);
  worksheet.mergeCells(1, 1, 1, columns.length);
  companyRow.getCell(1).font = { name: 'Arial', size: 16, bold: true };
  companyRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
  companyRow.height = 30;

  // 2. Add Title Header
  const titleRow = worksheet.addRow([title]);
  worksheet.mergeCells(2, 1, 2, columns.length);
  titleRow.getCell(1).font = { name: 'Arial', size: 14, bold: true };
  titleRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
  titleRow.height = 25;

  // 3. Add Export Date
  const dateRow = worksheet.addRow([`تاريخ الاستخراج: ${new Date().toLocaleString('ar-EG')}`]);
  worksheet.mergeCells(3, 1, 3, columns.length);
  dateRow.getCell(1).alignment = { horizontal: 'left' };
  dateRow.height = 20;

  worksheet.addRow([]); // Blank row

  // 4. Add Headers
  const headerRow = worksheet.addRow(columns.map(col => col.label));
  headerRow.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };
    cell.font = { bold: true };
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };
    cell.alignment = { horizontal: 'center' };
  });

  // 5. Add Data
  data.forEach(item => {
    const row = worksheet.addRow(columns.map(col => item[col.key]));
    row.eachCell((cell, colNumber) => {
      const colDef = columns[colNumber - 1];
      if (colDef.type === 'number' || colDef.type === 'currency') {
        cell.numFmt = colDef.type === 'currency' ? '#,##0.00 "ج.م"' : '#,##0.00';
      }
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
      cell.alignment = { horizontal: colDef.type === 'number' || colDef.type === 'currency' ? 'right' : 'center' };
    });
  });

  // 6. Add Summary Rows (with Formulas)
  if (summaryRows && summaryRows.length > 0) {
    summaryRows.forEach(summary => {
      const row = worksheet.addRow(columns.map(col => summary[col.key] || ''));
      row.eachCell((cell) => {
        cell.font = { bold: true };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF9FAFB' }
        };
      });
    });
  }

  // Auto-fit Columns
  worksheet.columns = columns.map(col => ({
    header: col.label,
    key: col.key,
    width: col.width || 20
  }));

  // Developer Signature Footer
  const footerRow = worksheet.addRow([]);
  const signatureRow = worksheet.addRow(["programmed by sabry elfeeb | Phone: 01065826742 | Email: sapry.eldeep@gmail.com"]);
  worksheet.mergeCells(signatureRow.number, 1, signatureRow.number, columns.length);
  signatureRow.getCell(1).font = { size: 9, italic: true, color: { argb: 'FF666666' } };
  signatureRow.getCell(1).alignment = { horizontal: 'center' };

  // Write to Buffer
  const buffer = await workbook.xlsx.writeBuffer();
  saveAs(new Blob([buffer]), `${filename}.xlsx`);
};
