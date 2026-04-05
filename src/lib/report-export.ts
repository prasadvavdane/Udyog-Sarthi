import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import type { ReportOutput } from '@/lib/reporting';

function escapeCell(value: string | number) {
  const stringValue = String(value ?? '');
  return `"${stringValue.replace(/"/g, '""')}"`;
}

export function buildCsv(report: ReportOutput) {
  const lines = [
    `${report.vendorName}`,
    `${report.title}`,
    `Generated At,${report.generatedAt}`,
    report.columns.map((column) => escapeCell(column.label)).join(','),
    ...report.rows.map((row) => report.columns.map((column) => escapeCell(row[column.key] ?? '')).join(',')),
    '',
    `Totals,${report.columns
      .slice(1)
      .map((column) => escapeCell(report.totals[column.key] ?? ''))
      .join(',')}`,
  ];

  return lines.join('\n');
}

export function buildExcelHtml(report: ReportOutput) {
  const headerRow = report.columns.map((column) => `<th>${column.label}</th>`).join('');
  const bodyRows = report.rows
    .map(
      (row) =>
        `<tr>${report.columns.map((column) => `<td>${String(row[column.key] ?? '')}</td>`).join('')}</tr>`,
    )
    .join('');

  const totalRow = `<tr>${report.columns
    .map((column, index) => `<td>${index === 0 ? 'Totals' : String(report.totals[column.key] ?? '')}</td>`)
    .join('')}</tr>`;

  return `
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          body { font-family: Arial, sans-serif; padding: 24px; }
          h1, h2, p { margin: 0 0 8px 0; }
          table { width: 100%; border-collapse: collapse; margin-top: 16px; }
          th, td { border: 1px solid #d4d4d4; padding: 8px; text-align: left; }
          tfoot td { font-weight: bold; }
        </style>
      </head>
      <body>
        <h1>${report.vendorName}</h1>
        <h2>${report.title}</h2>
        <p>Generated at: ${report.generatedAt}</p>
        <table>
          <thead><tr>${headerRow}</tr></thead>
          <tbody>${bodyRows}</tbody>
          <tfoot>${totalRow}</tfoot>
        </table>
      </body>
    </html>
  `;
}

export async function buildReportPdf(report: ReportOutput) {
  const pdf = await PDFDocument.create();
  let page = pdf.addPage([842, 595]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const marginX = 40;
  const marginY = 40;
  let y = page.getHeight() - marginY;

  const drawHeader = (targetPage: typeof page, pageNumber: number) => {
    targetPage.drawText(report.vendorName, { x: marginX, y: targetPage.getHeight() - 36, size: 18, font: bold });
    targetPage.drawText(report.title.toUpperCase(), { x: marginX, y: targetPage.getHeight() - 58, size: 12, font });
    targetPage.drawText(`Generated: ${new Date(report.generatedAt).toLocaleString('en-IN')}`, {
      x: marginX,
      y: targetPage.getHeight() - 74,
      size: 10,
      font,
      color: rgb(0.35, 0.35, 0.35),
    });
    targetPage.drawText(`Page ${pageNumber}`, {
      x: targetPage.getWidth() - 90,
      y: targetPage.getHeight() - 36,
      size: 10,
      font,
      color: rgb(0.35, 0.35, 0.35),
    });
  };

  const drawRow = (values: string[], targetPage: typeof page, startY: number, isHeader = false) => {
    const columnWidth = (targetPage.getWidth() - marginX * 2) / values.length;
    values.forEach((value, index) => {
      targetPage.drawText(value.slice(0, 28), {
        x: marginX + index * columnWidth,
        y: startY,
        size: 10,
        font: isHeader ? bold : font,
      });
    });
  };

  let pageNumber = 1;
  drawHeader(page, pageNumber);
  y -= 78;
  drawRow(report.columns.map((column) => column.label), page, y, true);
  y -= 18;

  for (const row of report.rows) {
    if (y < 70) {
      page = pdf.addPage([842, 595]);
      pageNumber += 1;
      drawHeader(page, pageNumber);
      y = page.getHeight() - 118;
      drawRow(report.columns.map((column) => column.label), page, y, true);
      y -= 18;
    }

    drawRow(
      report.columns.map((column) => String(row[column.key] ?? '')),
      page,
      y,
    );
    y -= 16;
  }

  y -= 8;
  page.drawText('Totals', { x: marginX, y, size: 10, font: bold });
  report.columns.slice(1).forEach((column, index) => {
    const columnWidth = (page.getWidth() - marginX * 2) / report.columns.length;
    page.drawText(String(report.totals[column.key] ?? ''), {
      x: marginX + (index + 1) * columnWidth,
      y,
      size: 10,
      font: bold,
    });
  });

  return pdf.save();
}
