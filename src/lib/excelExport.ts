import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

interface ExcelExportOptions {
  fileName: string;
  sheetName: string;
  headers: string[];
  data: any[][];
  title?: string;
  addTotals?: boolean;
  addAverage?: boolean;
}

export const exportToProfessionalExcel = async ({
  fileName,
  sheetName,
  headers,
  data,
  title,
  addTotals = true,
  addAverage = true
}: ExcelExportOptions) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(sheetName);

  // Set default font to Arial
  worksheet.views = [{ rightToLeft: true }]; // RTL for Arabic

  let currentRow = 1;

  // Add Title
  if (title) {
    const titleRow = worksheet.getRow(currentRow);
    titleRow.values = [title];
    worksheet.mergeCells(currentRow, 1, currentRow, headers.length);
    titleRow.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
    titleRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E3A8A' } // Navy #1E3A8A
    };
    titleRow.alignment = { vertical: 'middle', horizontal: 'center' };
    titleRow.height = 30;
    currentRow += 2;
  }

  // Add Headers
  const headerRow = worksheet.getRow(currentRow);
  headerRow.values = headers;
  headerRow.font = { name: 'Arial', bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1E3A8A' } // Navy #1E3A8A
  };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
  headerRow.height = 25;

  // Header Borders
  headerRow.eachCell((cell) => {
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };
  });

  currentRow++;

  // Add Data
  data.forEach((rowValues) => {
    const row = worksheet.getRow(currentRow);
    row.values = rowValues;
    row.font = { name: 'Arial', size: 11 };
    row.alignment = { vertical: 'middle', horizontal: 'center' };
    
    // Add borders to data cells
    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
      
      // Auto-format numbers/currency
      if (typeof cell.value === 'number') {
        cell.numFmt = '#,##0.00 "ج.م"';
      }
    });
    
    currentRow++;
  });

  const dataStartRow = title ? 4 : 2;
  const dataEndRow = currentRow - 1;

  // Add Totals
  if (addTotals) {
    const totalRow = worksheet.getRow(currentRow);
    totalRow.font = { name: 'Arial', bold: true };
    totalRow.getCell(1).value = 'الإجمالي (SUM)';
    
    // Find numeric columns (starting from index 2 to avoid ID/Date columns usually)
    for (let i = 2; i <= headers.length; i++) {
      const colLetter = worksheet.getColumn(i).letter;
      totalRow.getCell(i).value = {
        formula: `SUM(${colLetter}${dataStartRow}:${colLetter}${dataEndRow})`,
        result: 0
      };
      totalRow.getCell(i).numFmt = '#,##0.00 "ج.م"';
    }
    
    totalRow.eachCell((cell) => {
      cell.border = {
        top: { style: 'double' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF1F5F9' } // Light slate
      };
    });
    currentRow++;
  }

  // Add Average
  if (addAverage) {
    const avgRow = worksheet.getRow(currentRow);
    avgRow.font = { name: 'Arial', bold: true };
    avgRow.getCell(1).value = 'المتوسط (AVERAGE)';
    
    for (let i = 2; i <= headers.length; i++) {
      const colLetter = worksheet.getColumn(i).letter;
      avgRow.getCell(i).value = {
        formula: `AVERAGE(${colLetter}${dataStartRow}:${colLetter}${dataEndRow})`,
        result: 0
      };
      avgRow.getCell(i).numFmt = '#,##0.00 "ج.م"';
    }
    
    avgRow.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });
    currentRow++;
  }

  // Auto-fit columns
  worksheet.columns.forEach((column) => {
    let maxLength = 0;
    column.eachCell!({ includeEmpty: true }, (cell) => {
      const columnLength = cell.value ? cell.value.toString().length : 10;
      if (columnLength > maxLength) {
        maxLength = columnLength;
      }
    });
    column.width = maxLength < 12 ? 12 : maxLength + 2;
  });

  // Write file
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, `${fileName}.xlsx`);
};
