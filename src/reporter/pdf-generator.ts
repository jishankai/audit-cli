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
    
    // Extract summary data for visualization
    const summaryMatch = markdown.match(/\| Critical \| (\d+) \|[\s\S]*?\| High\s+\| (\d+) \|[\s\S]*?\| Medium\s+\| (\d+) \|[\s\S]*?\| Low\s+\| (\d+) \|[\s\S]*?\| Info\s+\| (\d+) \|/);
    const criticalCount = summaryMatch ? parseInt(summaryMatch[1]) : 0;
    const highCount = summaryMatch ? parseInt(summaryMatch[2]) : 0;
    const mediumCount = summaryMatch ? parseInt(summaryMatch[3]) : 0;
    const lowCount = summaryMatch ? parseInt(summaryMatch[4]) : 0;
    const infoCount = summaryMatch ? parseInt(summaryMatch[5]) : 0;
    const totalCount = criticalCount + highCount + mediumCount + lowCount + infoCount;
    
    const baseHTML = this.addSeverityClasses(html, criticalCount, highCount, mediumCount, lowCount, infoCount, totalCount).replace(/<h1[^>]*>[^<]*<\/h1>/i, '');
    const { htmlWithAnchors, toc } = this.addAnchorsAndTOC(baseHTML);
    
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Audit Report</title>
    <style>
        :root {
            /* Monochrome palette: black, white, gray only */
            --black: #000000;
            --dark-gray: #333333;
            --medium-gray: #666666;
            --light-gray: #999999;
            --very-light-gray: #cccccc;
            --border-gray: #dddddd;
            --bg-gray: #f5f5f5;
            --white: #ffffff;
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
            font-family: Arial, Helvetica, sans-serif;
            font-size: 10pt;
            line-height: 1.6;
            color: var(--black);
            background: var(--white);
            margin: 0;
            padding: 20px;
        }

        .page {
            max-width: 900px;
            margin: 0 auto;
            background: var(--white);
            padding: 40px;
        }

        /* Cover - Simple and Clean */
        .cover {
            padding: 100px 0;
            min-height: 700px;
            border-bottom: 3px solid var(--black);
        }

        .cover-header {
            margin-bottom: 200px;
        }

        .cover-subtitle {
            margin: 0 0 10px;
            font-size: 11pt;
            font-weight: normal;
            color: var(--medium-gray);
            text-transform: uppercase;
            letter-spacing: 0.1em;
        }

        .cover-title {
            margin: 0;
            font-size: 36pt;
            line-height: 1.2;
            font-weight: bold;
            color: var(--black);
        }

        .cover-description {
            margin: 20px 0 0;
            font-size: 11pt;
            line-height: 1.6;
            color: var(--medium-gray);
            max-width: 500px;
        }

        .cover-footer {
            border-top: 1px solid var(--border-gray);
            padding-top: 20px;
        }

        .cover-meta {
            display: flex;
            justify-content: space-between;
            align-items: baseline;
        }

        .cover-byline {
            margin: 0;
            font-size: 11pt;
            color: var(--black);
            font-weight: bold;
        }

        .cover-date {
            margin: 0;
            font-size: 10pt;
            color: var(--medium-gray);
        }

        .cover-badge {
            display: none;
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
            color: var(--black);
            page-break-after: avoid;
            margin: 0;
            font-weight: bold;
        }

        h2 {
            font-size: 16pt;
            margin-top: 30px;
            margin-bottom: 12px;
            padding-bottom: 8px;
            border-bottom: 2px solid var(--black);
        }

        h3 {
            font-size: 12pt;
            margin-top: 20px;
            margin-bottom: 8px;
        }

        h4 {
            font-size: 10pt;
            margin-top: 14px;
            margin-bottom: 6px;
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
            margin: 12px 0 20px;
            border: 1px solid var(--border-gray);
        }

        th, td {
            padding: 10px 12px;
            text-align: left;
            border: 1px solid var(--border-gray);
            font-size: 9pt;
        }

        th {
            background: var(--bg-gray);
            font-weight: bold;
            color: var(--black);
        }

        tr:nth-child(even) td {
            background: var(--white);
        }

        tr:nth-child(odd) td {
            background: var(--white);
        }

        code {
            background-color: var(--bg-gray);
            padding: 2px 4px;
            font-family: 'Courier New', Courier, monospace;
            font-size: 9pt;
            color: var(--black);
        }

        pre {
            background: var(--bg-gray);
            color: var(--black);
            padding: 12px;
            border: 1px solid var(--border-gray);
            overflow-x: auto;
            page-break-inside: avoid;
            font-size: 8pt;
            line-height: 1.4;
        }

        pre code {
            background: transparent;
            padding: 0;
        }

        blockquote {
            border-left: 3px solid var(--black);
            margin: 12px 0;
            padding: 8px 16px;
            color: var(--dark-gray);
            background: var(--bg-gray);
        }

        .severity-critical,
        .severity-high,
        .severity-medium,
        .severity-low,
        .severity-info {
            display: inline-block;
            padding: 3px 8px;
            font-weight: bold;
            font-size: 9pt;
            border: 1px solid var(--black);
            background: var(--white);
            color: var(--black);
        }
        
        .severity-critical {
            background: var(--black);
            color: var(--white);
        }
        
        .severity-high {
            background: var(--dark-gray);
            color: var(--white);
        }
        
        .severity-medium {
            background: var(--medium-gray);
            color: var(--white);
        }
        
        .severity-low {
            background: var(--light-gray);
            color: var(--black);
        }
        
        .severity-info {
            background: var(--white);
            color: var(--black);
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
            background: var(--white);
            border: 1px solid var(--border-gray);
            padding: 16px;
            margin: 16px 0;
        }
        
        .finding {
            margin: 16px 0;
            border: 1px solid var(--border-gray);
            padding: 12px;
            page-break-inside: avoid;
            background: var(--white);
        }
        
        .finding-header {
            border-bottom: 1px solid var(--border-gray);
            padding-bottom: 8px;
            margin-bottom: 10px;
        }

        hr {
            border: none;
            border-top: 1px solid var(--border-gray);
            margin: 20px 0;
        }

        .toc {
            background: var(--white);
            border: 1px solid var(--border-gray);
            padding: 20px;
            margin-top: 0;
        }

        .toc h2 {
            margin-top: 0;
            margin-bottom: 16px;
        }

        .toc > ol {
            list-style: none;
            padding-left: 0;
            margin: 10px 0 0;
        }

        .toc li {
            margin: 6px 0;
            line-height: 1.5;
        }

        .toc a {
            color: var(--black);
            text-decoration: none;
        }

        .toc-sub {
            list-style: none;
            padding-left: 20px;
            margin: 4px 0;
        }

        .toc-sub li {
            margin: 3px 0;
            font-size: 9pt;
            color: var(--medium-gray);
        }

        .toc-sub li::before {
            content: '- ';
            color: var(--medium-gray);
        }

        /* Summary Chart Styles */
        .summary-chart {
            background: var(--white);
            border: 1px solid var(--border-gray);
            padding: 16px;
            margin: 16px 0;
        }

        .chart-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 16px;
            padding-bottom: 12px;
            border-bottom: 1px solid var(--border-gray);
        }

        .chart-header h3 {
            margin: 0;
            font-size: 12pt;
        }

        .total-badge {
            background: var(--black);
            color: var(--white);
            padding: 4px 12px;
            font-weight: bold;
            font-size: 10pt;
        }

        .chart-grid {
            display: table;
            width: 100%;
            border-collapse: collapse;
        }

        .chart-row {
            display: table-row;
        }

        .severity-label,
        .bar-container,
        .count-badge {
            display: table-cell;
            padding: 6px 8px;
            vertical-align: middle;
            border-bottom: 1px solid var(--very-light-gray);
        }

        .severity-label {
            width: 100px;
            font-weight: bold;
            font-size: 9pt;
        }

        .bar-container {
            background: var(--bg-gray);
            border: 1px solid var(--border-gray);
            height: 24px;
            position: relative;
        }

        .bar {
            height: 100%;
            position: absolute;
            left: 0;
            top: 0;
        }

        .bar.critical { background: var(--black); }
        .bar.high { background: var(--dark-gray); }
        .bar.medium { background: var(--medium-gray); }
        .bar.low { background: var(--light-gray); }
        .bar.info { background: var(--very-light-gray); }

        .count-badge {
            text-align: right;
            font-weight: bold;
            font-size: 10pt;
            width: 50px;
        }

        .no-findings {
            text-align: center;
            padding: 30px 20px;
        }

        .success-message {
            font-size: 11pt;
            font-weight: bold;
            margin: 10px 0 0;
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
        <div class="cover-header">
          <p class="cover-subtitle">Smart Contract Security</p>
          <h1 class="cover-title">Audit Report</h1>
        </div>
        <div class="cover-footer">
          <div class="cover-meta">
            <p class="cover-byline">${projectName}</p>
            ${auditDate ? `<p class="cover-date">${auditDate}</p>` : '<p class="cover-date">Generated by audit-cli</p>'}
          </div>
        </div>
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

    // Build nested TOC structure
    let toc = '';
    let h2Count = 0;
    let currentH2HasChildren = false;
    let childrenList = '';
    
    for (let i = 0; i < tocItems.length; i++) {
      const item = tocItems[i];
      
      if (item.level === 2) {
        // Close previous H2's children list if exists
        if (currentH2HasChildren && childrenList) {
          toc += `<ol class="toc-sub">${childrenList}</ol></li>\n`;
          childrenList = '';
          currentH2HasChildren = false;
        } else if (h2Count > 0) {
          toc += `</li>\n`;
        }
        
        h2Count++;
        toc += `<li><a href="#${item.id}">${item.text}</a>`;
        
        // Check if next item is H3 (child)
        if (i + 1 < tocItems.length && tocItems[i + 1].level === 3) {
          currentH2HasChildren = true;
        } else {
          toc += `</li>\n`;
        }
      } else if (item.level === 3 && currentH2HasChildren) {
        childrenList += `<li><a href="#${item.id}">${item.text}</a></li>\n`;
      }
    }
    
    // Close last item
    if (currentH2HasChildren && childrenList) {
      toc += `<ol class="toc-sub">${childrenList}</ol></li>\n`;
    } else if (h2Count > 0) {
      toc += `</li>\n`;
    }

    return { htmlWithAnchors, toc };
  }

  private generateSummaryChart(critical: number, high: number, medium: number, low: number, info: number, total: number): string {
    if (total === 0) {
      return `
        <div class="summary-chart">
          <div class="chart-header">
            <h3>Findings Overview</h3>
            <div class="total-badge">0 Issues</div>
          </div>
          <div class="no-findings">
            <p class="success-message">✓ No security issues detected</p>
          </div>
        </div>
      `;
    }

    const maxValue = Math.max(critical, high, medium, low, info, 1);
    const getBarWidth = (count: number) => Math.round((count / maxValue) * 100);
    
    return `
      <div class="summary-chart">
        <div class="chart-header">
          <h3>Findings Overview</h3>
          <div class="total-badge">${total} Total</div>
        </div>
        <div class="chart-grid">
          <div class="chart-row">
            <div class="severity-label">Critical</div>
            <div class="bar-container">
              <div class="bar critical" style="width: ${getBarWidth(critical)}%"></div>
            </div>
            <div class="count-badge">${critical}</div>
          </div>
          <div class="chart-row">
            <div class="severity-label">High</div>
            <div class="bar-container">
              <div class="bar high" style="width: ${getBarWidth(high)}%"></div>
            </div>
            <div class="count-badge">${high}</div>
          </div>
          <div class="chart-row">
            <div class="severity-label">Medium</div>
            <div class="bar-container">
              <div class="bar medium" style="width: ${getBarWidth(medium)}%"></div>
            </div>
            <div class="count-badge">${medium}</div>
          </div>
          <div class="chart-row">
            <div class="severity-label">Low</div>
            <div class="bar-container">
              <div class="bar low" style="width: ${getBarWidth(low)}%"></div>
            </div>
            <div class="count-badge">${low}</div>
          </div>
          <div class="chart-row">
            <div class="severity-label">Info</div>
            <div class="bar-container">
              <div class="bar info" style="width: ${getBarWidth(info)}%"></div>
            </div>
            <div class="count-badge">${info}</div>
          </div>
        </div>
      </div>
    `;
  }

  private addSeverityClasses(html: string, critical: number, high: number, medium: number, low: number, info: number, total: number): string {
    // Add severity classes for styling
    let processedHTML = html;
    
    // Replace severity badges
    processedHTML = processedHTML.replace(
        /\*\*Severity:\*\*\s*(Critical|High|Medium|Low|Info)/g,
        (_, severity) => {
            const className = `severity-${severity.toLowerCase()}`;
            return `<strong>Severity:</strong> <span class="${className}">${severity}</span>`;
        }
    );
    
    // Insert summary chart after Executive Summary heading
    const chart = this.generateSummaryChart(critical, high, medium, low, info, total);
    processedHTML = processedHTML.replace(
      /(<h2[^>]*>Executive Summary<\/h2>)/i,
      `$1\n${chart}`
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
