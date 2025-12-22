import fs from 'fs-extra';
import path from 'path';
import { marked } from 'marked';

export class PDFGenerator {
  private markdownToHTML(markdown: string): string {
    const html = marked(markdown);
    const projectMatch = markdown.match(/\*\*Project:\*\*\s*([^\n*]+)/);
    const auditDateMatch = markdown.match(/\*\*Audit Date:\*\*\s*([^\n*]+)/);
    const projectName = projectMatch ? projectMatch[1].trim() : 'Smart Contract Audit';
    const auditDate = auditDateMatch ? auditDateMatch[1].trim() : '';
    const baseHTML = this.addSeverityClasses(html).replace(/<h1[^>]*>[^<]*<\/h1>/i, '');
    const { htmlWithAnchors, toc } = this.addAnchorsAndTOC(baseHTML);
    
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Smart Contract Security Audit Report</title>
    <style>
        :root {
            --ink-950: #0b1224;
            --ink-900: #0f172a;
            --ink-800: #111827;
            --muted: #475569;
            --border: #e2e8f0;
            --border-strong: #cbd5e1;
            --card: #f8fafc;
            --accent: #0ea5e9;
            --accent-strong: #2563eb;
        }

        * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact;
            color-adjust: exact;
        }

        @page {
            margin: 18mm 16mm;
        }

        body {
            font-family: 'Inter', 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
            font-size: 15px;
            line-height: 1.7;
            color: var(--ink-800);
            background: #e8ecf5;
            margin: 0;
            padding: 28px;
        }

        .page {
            max-width: 1050px;
            margin: 0 auto;
            background: #ffffff;
            padding: 42px 46px;
            border-radius: 16px;
            box-shadow: 0 20px 48px rgba(15, 23, 42, 0.14);
        }

        .cover {
            display: flex;
            flex-direction: column;
            gap: 18px;
            background: linear-gradient(135deg, rgba(14, 165, 233, 0.08), rgba(37, 99, 235, 0.12));
            border: 1px solid var(--border);
            border-radius: 16px;
            padding: 28px 26px;
        }

        .eyebrow {
            letter-spacing: 0.08em;
            text-transform: uppercase;
            font-size: 11px;
            color: var(--muted);
            margin: 0 0 10px;
            font-weight: 700;
        }

        .report-title {
            margin: 0 0 6px;
            font-size: 32px;
            color: var(--ink-950);
            letter-spacing: -0.02em;
        }

        .cover h1 {
            font-size: 32px;
            letter-spacing: -0.02em;
            margin: 0;
            color: var(--ink-950);
        }

        .subtitle {
            font-size: 15px;
            color: var(--muted);
            margin: 4px 0 0;
        }

        .cover-meta {
            display: flex;
            gap: 14px;
            flex-wrap: wrap;
            margin-top: 12px;
        }

        .meta-chip {
            background: #ffffff;
            border: 1px solid var(--border);
            border-radius: 12px;
            padding: 10px 12px;
            font-weight: 600;
            color: var(--ink-800);
            box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08);
        }

        .pill {
            background: linear-gradient(135deg, var(--accent), var(--accent-strong));
            color: #ffffff;
            padding: 10px 14px;
            border-radius: 12px;
            font-weight: 700;
            font-size: 13px;
            white-space: nowrap;
            box-shadow: 0 8px 24px rgba(37, 99, 235, 0.25);
        }

        .section {
            margin-top: 28px;
        }

        main {
            display: flex;
            flex-direction: column;
            gap: 18px;
        }

        h1, h2, h3, h4 {
            color: var(--ink-900);
            page-break-after: avoid;
            margin: 0;
            letter-spacing: -0.01em;
            font-weight: 700;
        }

        h2 {
            font-size: 22px;
            margin-top: 26px;
            padding-bottom: 10px;
            border-bottom: 1px solid var(--border-strong);
        }

        h3 {
            font-size: 17px;
            margin-top: 18px;
        }

        p {
            margin: 8px 0 12px;
        }

        ul, ol {
            padding-left: 20px;
            margin: 6px 0 14px;
        }

        a {
            color: var(--accent-strong);
            text-decoration: none;
        }

        a:hover {
            text-decoration: underline;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            margin: 12px 0 18px;
            border: 1px solid var(--border-strong);
            border-radius: 10px;
            overflow: hidden;
        }

        th, td {
            padding: 12px 14px;
            text-align: left;
            border-bottom: 1px solid var(--border);
        }

        th {
            background: #eff6ff;
            font-weight: 700;
            font-size: 13px;
            letter-spacing: 0.02em;
            text-transform: uppercase;
            color: var(--ink-800);
        }

        tr:nth-child(even) td {
            background: #f9fbff;
        }

        tr:last-child td {
            border-bottom: none;
        }

        table:first-of-type {
            background: #f8fafc;
            border-color: var(--border);
        }

        code {
            background-color: #f1f5f9;
            padding: 2px 6px;
            border-radius: 6px;
            font-family: 'SFMono-Regular', 'Menlo', 'Ubuntu Mono', monospace;
            font-size: 0.95em;
        }

        pre {
            background: #0f172a;
            color: #e2e8f0;
            padding: 16px 18px;
            border-radius: 10px;
            overflow-x: auto;
            border: 1px solid #1f2937;
            page-break-inside: avoid;
            font-size: 0.93em;
        }

        pre code {
            background: transparent;
            color: inherit;
            padding: 0;
        }

        blockquote {
            border-left: 4px solid var(--accent-strong);
            margin: 12px 0 18px;
            padding-left: 16px;
            color: var(--muted);
            background: #f8fafc;
            border-radius: 0 8px 8px 0;
        }

        .severity-critical,
        .severity-high,
        .severity-medium,
        .severity-low,
        .severity-info {
            display: inline-flex;
            align-items: center;
            padding: 4px 10px;
            border-radius: 999px;
            font-weight: 700;
            font-size: 12px;
            border: 1px solid transparent;
        }

        .severity-critical {
            color: #b91c1c;
            background: #fff1f2;
            border-color: #fecdd3;
        }
        
        .severity-high {
            color: #b45309;
            background: #fef3c7;
            border-color: #fde68a;
        }
        
        .severity-medium {
            color: #92400e;
            background: #fffbeb;
            border-color: #fcd34d;
        }
        
        .severity-low {
            color: #1f2937;
            background: #f8fafc;
            border-color: #e5e7eb;
        }
        
        .severity-info {
            color: #0f3b66;
            background: #e0f2fe;
            border-color: #bfdbfe;
        }

        .page-break {
            page-break-before: always;
        }

        .page-break-after {
            page-break-after: always;
        }
        
        .no-break {
            page-break-inside: avoid;
        }
        
        .summary-box {
            background-color: var(--card);
            border: 1px solid var(--border);
            border-radius: 10px;
            padding: 18px;
            margin: 18px 0;
        }
        
        .finding {
            margin: 14px 0 22px;
            border: 1px solid var(--border);
            border-radius: 12px;
            padding: 18px 18px 14px;
            page-break-inside: avoid;
            background: #ffffff;
            box-shadow: 0 4px 16px rgba(15, 23, 42, 0.06);
        }
        
        .finding-header {
            border-bottom: 1px solid var(--border);
            padding-bottom: 10px;
            margin-bottom: 12px;
        }

        hr {
            border: none;
            height: 1px;
            background: linear-gradient(90deg, rgba(37, 99, 235, 0.3), rgba(14, 165, 233, 0.1), rgba(15, 23, 42, 0.05));
            margin: 28px 0 18px;
        }

        .toc {
            background: #f8fafc;
            border: 1px solid var(--border);
            border-radius: 12px;
            padding: 18px;
            margin-top: 18px;
        }

        .toc h2 {
            margin-top: 0;
            border-bottom: none;
            padding-bottom: 0;
        }

        .toc ol {
            list-style: none;
            padding: 0;
            margin: 10px 0 0;
        }

        .toc li {
            margin: 6px 0;
            font-weight: 600;
        }

        .toc a {
            color: var(--ink-900);
            text-decoration: none;
        }

        .toc a:hover {
            color: var(--accent-strong);
        }

        .toc .l3 {
            padding-left: 14px;
            font-weight: 500;
            color: var(--muted);
        }
        
        @media print {
            body {
                background: #ffffff;
                padding: 0;
            }
            
            .page {
                margin: 0;
                border-radius: 0;
                box-shadow: none;
                padding: 0;
            }
            
            .page-break {
                page-break-before: always;
            }
        }
    </style>
</head>
<body>
    <div class="page">
      <section class="cover page-break-after">
        <div>
          <p class="eyebrow">Smart Contract Audit Report</p>
          <h1 class="report-title">${projectName}</h1>
          ${auditDate ? `<p class="subtitle">Audit Date: ${auditDate}</p>` : ''}
        </div>
        <div class="cover-meta">
          <span class="meta-chip">Prepared by audit-cli</span>
          <span class="meta-chip">Format: PDF</span>
          <span class="meta-chip">Version: 1.0</span>
        </div>
        <div class="pill">Confidential</div>
      </section>
      <section class="section toc page-break-after">
        <h2>Table of Contents</h2>
        <ol>
          ${toc}
        </ol>
      </section>
      <main>
        ${htmlWithAnchors}
      </main>
    </div>
</body>
</html>`;
  }

  private addAnchorsAndTOC(html: string): { htmlWithAnchors: string; toc: string } {
    const headingRegex = /<h([2-4])([^>]*)>(.*?)<\/h\1>/g;
    const usedIds = new Set<string>();
    const tocItems: { level: number; text: string; id: string }[] = [];

    const slugify = (text: string): string => text
      .toLowerCase()
      .replace(/<[^>]+>/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-');

    const htmlWithAnchors = html.replace(headingRegex, (_match, level, attrs, title) => {
      const textContent = title.replace(/<[^>]+>/g, '').trim();
      let id = slugify(textContent) || `section-${tocItems.length + 1}`;

      while (usedIds.has(id)) {
        id = `${id}-${usedIds.size + 1}`;
      }
      usedIds.add(id);

      tocItems.push({ level: Number(level), text: textContent, id });
      const attrsString = attrs && attrs.trim() ? ` ${attrs.trim()}` : '';
      return `<h${level} id="${id}"${attrsString}>${title}</h${level}>`;
    });

    const toc = tocItems.map(item => {
      const levelClass = item.level === 3 ? 'l3' : '';
      return `<li class="${levelClass}"><a href="#${item.id}">${item.text}</a></li>`;
    }).join('\n');

    return { htmlWithAnchors, toc };
  }

  private addSeverityClasses(html: string): string {
    // Add severity classes for styling
    let processedHTML = html;
    
    processedHTML = processedHTML.replace(
        /\*\*Severity:\*\*\s*(Critical|High|Medium|Low|Info)/g,
        (_, severity) => {
            const className = `severity-${severity.toLowerCase()}`;
            return `<strong>Severity:</strong> <span class="${className}">${severity}</span>`;
        }
    );
    
    return processedHTML;
  }

  async generatePDF(markdown: string, outputPath: string, timestamp: string): Promise<string> {
    const html = this.markdownToHTML(markdown);
    
    const defaultPath = outputPath || path.join(process.cwd(), 'reports');
    await fs.ensureDir(defaultPath);
    
    const safeTimestamp = timestamp || new Date().toISOString().replace(/[:.]/g, '-');
    const htmlFile = path.resolve(path.join(defaultPath, `audit-report-${safeTimestamp}.html`));
    const pdfFile = path.resolve(path.join(defaultPath, `audit-report-${safeTimestamp}.pdf`));
    
    // Always generate HTML file first
    await fs.writeFile(htmlFile, html);
    console.log(`HTML report generated: ${htmlFile}`);
    
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);
    
    try {
      if (process.platform === 'darwin') {
        // macOS: Try wkhtmltopdf first (most reliable)
        try {
          await execAsync('which wkhtmltopdf');
          await execAsync(`wkhtmltopdf --page-size A4 --orientation Portrait --margin-top 1cm --margin-right 1cm --margin-bottom 1cm --margin-left 1cm "${htmlFile}" "${pdfFile}"`);
          console.log('✅ PDF generated successfully using wkhtmltopdf');
          return pdfFile;
        } catch (e) {
          console.log('⚠️  wkhtmltopdf not available, trying Chrome...');
        }
        
        // Try Chrome on macOS
        try {
          const chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
          await execAsync(`test -f "${chromePath}"`);
          await execAsync(`"${chromePath}" --headless --disable-gpu --print-to-pdf="${pdfFile}" --print-to-pdf-no-header "${htmlFile}"`);
          console.log('✅ PDF generated successfully using Chrome headless');
          return pdfFile;
        } catch (e) {
          console.log('⚠️  Chrome headless failed, opening in browser...');
        }
        
        // Fallback: open in browser and instruct user
        console.log('📖 Opening HTML file in browser. Please save as PDF manually (Cmd+P > Save as PDF)');
        await execAsync(`open "${htmlFile}"`);
        return htmlFile;
        
      } else if (process.platform === 'linux') {
        // Linux: Try Chrome/Chromium
        const browsers = ['google-chrome', 'chromium-browser', 'chromium'];
        
        for (const browser of browsers) {
          try {
            await execAsync(`which ${browser}`);
            await execAsync(`"${browser}" --headless --disable-gpu --print-to-pdf="${pdfFile}" --print-to-pdf-no-header "${htmlFile}"`);
            console.log(`✅ PDF generated successfully using ${browser}`);
            return pdfFile;
          } catch (e) {
            continue;
          }
        }
        
        console.log('📖 Opening HTML file in browser. Please save as PDF manually (Ctrl+P > Save as PDF)');
        await execAsync(`xdg-open "${htmlFile}"`);
        return htmlFile;
        
      } else if (process.platform === 'win32') {
        // Windows: Try Chrome
        try {
          await execAsync('where chrome');
          await execAsync(`chrome --headless --disable-gpu --print-to-pdf="${pdfFile}" --print-to-pdf-no-header "${htmlFile}"`);
          console.log('✅ PDF generated successfully using Chrome headless');
          return pdfFile;
        } catch (e) {
          console.log('📖 Opening HTML file in browser. Please save as PDF manually (Ctrl+P > Save as PDF)');
          await execAsync(`start "" "${htmlFile}"`);
          return htmlFile;
        }
      }
    } catch (error) {
      console.log('❌ PDF generation failed. HTML file created:', htmlFile);
      console.log('💡 You can manually convert to PDF using your browser\'s print function.');
      return htmlFile;
    }
    
    return pdfFile;
  }
}
