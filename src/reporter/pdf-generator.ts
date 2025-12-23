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
            /* Monochrome palette: black / white / greys */
            --ink-950: #0a0a0a;
            --ink-900: #111111;
            --ink-800: #1a1a1a;
            --muted: #595959;
            --border: #d9d9d9;
            --border-strong: #bfbfbf;
            --card: #f2f2f2;
            --accent: #111111;
            --accent-strong: #111111;
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
            background: #f2f2f2;
            margin: 0;
            padding: 28px;
        }

        .page {
            max-width: 1050px;
            margin: 0 auto;
            background: #ffffff;
            padding: 42px 46px;
            border-radius: 16px;
            box-shadow: 0 12px 32px rgba(0, 0, 0, 0.12);
        }

        /* Cover (minimal) */
        .cover {
            display: flex;
            flex-direction: column;
            justify-content: center;
            background: #ffffff;
            border: 1px solid var(--border-strong);
            border-radius: 0;
            padding: 76px 64px;
            min-height: 740px;
        }

        .cover-title {
            margin: 0;
            font-size: 48px;
            line-height: 1.08;
            letter-spacing: -0.03em;
            font-weight: 900;
            color: var(--ink-950);
        }

        .cover-byline {
            margin: 18px 0 0;
            font-size: 14px;
            color: var(--muted);
            font-weight: 700;
        }

        .cover-date {
            margin: 10px 0 0;
            font-size: 14px;
            color: var(--muted);
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
            color: inherit;
            text-decoration: underline;
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
            background: #f0f0f0;
            font-weight: 700;
            font-size: 13px;
            letter-spacing: 0.02em;
            text-transform: uppercase;
            color: var(--ink-800);
        }

        tr:nth-child(even) td {
            background: #fafafa;
        }

        tr:last-child td {
            border-bottom: none;
        }

        table:first-of-type {
            background: #f5f5f5;
            border-color: var(--border);
        }

        code {
            background-color: #f2f2f2;
            padding: 2px 6px;
            border-radius: 6px;
            font-family: 'SFMono-Regular', 'Menlo', 'Ubuntu Mono', monospace;
            font-size: 0.95em;
        }

        pre {
            background: #111111;
            color: #eeeeee;
            padding: 16px 18px;
            border-radius: 10px;
            overflow-x: auto;
            border: 1px solid #333333;
            page-break-inside: avoid;
            font-size: 0.93em;
        }

        pre code {
            background: transparent;
            color: inherit;
            padding: 0;
        }

        blockquote {
            border-left: 4px solid #111111;
            margin: 12px 0 18px;
            padding-left: 16px;
            color: var(--muted);
            background: #f5f5f5;
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
            color: #111111;
            background: #efefef;
            border-color: #111111;
        }
        
        .severity-high {
            color: #111111;
            background: #f5f5f5;
            border-color: #444444;
        }
        
        .severity-medium {
            color: #111111;
            background: #fafafa;
            border-color: #777777;
        }
        
        .severity-low {
            color: #111111;
            background: #ffffff;
            border-color: #aaaaaa;
        }
        
        .severity-info {
            color: #111111;
            background: #ffffff;
            border-color: #cccccc;
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
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
        }
        
        .finding-header {
            border-bottom: 1px solid var(--border);
            padding-bottom: 10px;
            margin-bottom: 12px;
        }

        hr {
            border: none;
            height: 1px;
            background: #d9d9d9;
            margin: 28px 0 18px;
        }

        .toc {
            background: #f5f5f5;
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
            color: var(--ink-900);
            text-decoration: underline;
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
        <h1 class="cover-title">${projectName} Security Review</h1>
        <p class="cover-byline">Audit by audit-cli</p>
        ${auditDate ? `<p class="cover-date">${auditDate}</p>` : ''}
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
      // Keep dependencies minimal: rely on system tools if available.
      // Optional overrides:
      // - AUDIT_CLI_PDF_WKHTMLTOPDF_PATH: absolute path to wkhtmltopdf
      // - AUDIT_CLI_PDF_CHROME_PATH: absolute path to Chrome/Chromium
      const wkhtmltopdfOverride = process.env.AUDIT_CLI_PDF_WKHTMLTOPDF_PATH;
      const chromeOverride = process.env.AUDIT_CLI_PDF_CHROME_PATH;

      const chromePrintCmd = async (chromeCmd: string): Promise<void> => {
        // These flags disable the browser-generated header/footer (which can show file://...html).
        // `--headless=new` is important on newer Chrome for consistent PDF output.
        await execAsync(
          `"${chromeCmd}" --headless=new --disable-gpu --no-pdf-header-footer --print-to-pdf-no-header --print-to-pdf="${pdfFile}" "${htmlFile}"`
        );
      };

      if (process.platform === 'darwin') {
        // macOS: Try wkhtmltopdf first (typically the most reliable if installed)
        try {
          const wkhtmltopdfCmd = wkhtmltopdfOverride ?? 'wkhtmltopdf';
          if (wkhtmltopdfOverride) {
            await execAsync(`test -f "${wkhtmltopdfOverride}"`);
          } else {
            await execAsync('which wkhtmltopdf');
          }

          await execAsync(
            `"${wkhtmltopdfCmd}" --page-size A4 --orientation Portrait --margin-top 1cm --margin-right 1cm --margin-bottom 1cm --margin-left 1cm "${htmlFile}" "${pdfFile}"`
          );
          console.log('✅ PDF generated successfully using wkhtmltopdf');
          return pdfFile;
        } catch {
          // fall through
        }

        // Try Chrome on macOS
        try {
          const chromeCmd = chromeOverride ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
          await execAsync(`test -f "${chromeCmd}"`);
          await chromePrintCmd(chromeCmd);
          console.log('✅ PDF generated successfully using Chrome headless');
          return pdfFile;
        } catch {
          // fall through
        }

        console.log('📄 PDF engine not available. HTML file created:', htmlFile);
        console.log('💡 Open it in a browser and Print -> Save as PDF (Cmd+P). Disable "Headers and footers" to hide file://...');
        return htmlFile;

      } else if (process.platform === 'linux') {
        const browsers = chromeOverride ? [chromeOverride] : ['google-chrome', 'chromium-browser', 'chromium'];

        for (const browser of browsers) {
          try {
            if (!chromeOverride) {
              await execAsync(`which ${browser}`);
            }
            await chromePrintCmd(browser);
            console.log(`✅ PDF generated successfully using ${browser}`);
            return pdfFile;
          } catch {
            continue;
          }
        }

        console.log('📄 PDF engine not available. HTML file created:', htmlFile);
        console.log('💡 Open it in a browser and Print -> Save as PDF (Ctrl+P). Disable "Headers and footers" to hide file://...');
        return htmlFile;

      } else if (process.platform === 'win32') {
        const chromeCmd = chromeOverride ?? 'chrome';

        try {
          if (chromeOverride) {
            await execAsync(`if exist "${chromeOverride}" (exit 0) else (exit 1)`);
          } else {
            await execAsync('where chrome');
          }

          await chromePrintCmd(chromeCmd);
          console.log('✅ PDF generated successfully using Chrome headless');
          return pdfFile;
        } catch {
          console.log('📄 PDF engine not available. HTML file created:', htmlFile);
          console.log('💡 Open it in a browser and Print -> Save as PDF (Ctrl+P). Disable "Headers and footers" to hide file://...');
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
