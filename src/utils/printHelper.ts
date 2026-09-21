/**
 * Universal Native Print Helper
 * Guarantees triggering the operating system's native printer dialog (A4, Thermal, PDF)
 * without generating blank pages or breaking the React DOM tree.
 */
export const triggerNativePrint = (element: HTMLElement | null, title: string = 'طباعة مستند') => {
  const contentHtml = element ? element.innerHTML : '';
  const styleElements = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
    .map(style => style.outerHTML)
    .join('\n');

  const fullPrintHtml = `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
      <head>
        <meta charset="utf-8">
        <title>${title}</title>
        ${styleElements}
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap');
          * {
            box-sizing: border-box !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          html, body {
            background: #ffffff !important;
            color: #000000 !important;
            margin: 0 !important;
            padding: 4mm !important;
            font-family: 'Cairo', 'Segoe UI', Tahoma, sans-serif !important;
            direction: rtl !important;
            width: 100% !important;
          }
          .no-print, button, .print\\:hidden, [role="dialog"] button, header, nav { 
            display: none !important; 
          }
          .print\\:block { display: block !important; }
          .print\\:hidden { display: none !important; }
          @page {
            size: auto;
            margin: 5mm;
          }
          table {
            width: 100% !important;
            border-collapse: collapse !important;
          }
          th, td {
            border: 1px solid #94a3b8 !important;
            padding: 6px 8px !important;
            font-size: 11px !important;
          }
          th {
            background-color: #0f172a !important;
            color: #ffffff !important;
          }
        </style>
      </head>
      <body>
        <div class="printable-wrapper">${contentHtml}</div>
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.focus();
              window.print();
            }, 250);
          };
        </script>
      </body>
    </html>
  `;

  // 1. Preferred approach: Hidden iFrame printing for seamless in-app printing
  try {
    let iframe = document.getElementById('native-print-iframe') as HTMLIFrameElement | null;
    if (iframe) {
      document.body.removeChild(iframe);
    }
    iframe = document.createElement('iframe');
    iframe.id = 'native-print-iframe';
    iframe.style.position = 'fixed';
    iframe.style.right = '-9999px';
    iframe.style.bottom = '-9999px';
    iframe.style.width = '10px';
    iframe.style.height = '10px';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document || iframe.contentDocument;
    if (doc) {
      doc.open();
      doc.write(fullPrintHtml);
      doc.close();
      setTimeout(() => {
        iframe?.contentWindow?.focus();
        iframe?.contentWindow?.print();
      }, 400);
      return;
    }
  } catch (err) {
    console.warn('iFrame print failed, falling back to direct window print', err);
  }

  // 2. Direct Window Print as secondary fallback
  window.print();
};


