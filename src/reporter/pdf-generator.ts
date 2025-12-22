import fs from 'fs-extra';
import path from 'path';
import { marked } from 'marked';

export class PDFGenerator {
  private markdownToHTML(markdown: string): string {
    const html = marked(markdown);
    
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Smart Contract Security Audit Report</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background-color: #fff;
        }
        
        h1 {
            color: #2c3e50;
            border-bottom: 3px solid #3498db;
            padding-bottom: 10px;
            page-break-after: avoid;
        }
        
        h2 {
            color: #34495e;
            border-bottom: 2px solid #ecf0f1;
            padding-bottom: 5px;
            page-break-after: avoid;
        }
        
        h3 {
            color: #7f8c8d;
            page-break-after: avoid;
        }
        
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
        }
        
        th, td {
            border: 1px solid #ddd;
            padding: 12px;
            text-align: left;
        }
        
        th {
            background-color: #f8f9fa;
            font-weight: 600;
        }
        
        code {
            background-color: #f8f9fa;
            padding: 2px 4px;
            border-radius: 3px;
            font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
            font-size: 0.9em;
        }
        
        pre {
            background-color: #f8f9fa;
            padding: 15px;
            border-radius: 5px;
            overflow-x: auto;
            border-left: 4px solid #3498db;
            page-break-inside: avoid;
        }
        
        pre code {
            background-color: transparent;
            padding: 0;
        }
        
        blockquote {
            border-left: 4px solid #3498db;
            margin: 20px 0;
            padding-left: 20px;
            color: #7f8c8d;
        }
        
        .severity-critical {
            color: #e74c3c;
            font-weight: bold;
        }
        
        .severity-high {
            color: #f39c12;
            font-weight: bold;
        }
        
        .severity-medium {
            color: #f1c40f;
            font-weight: bold;
        }
        
        .severity-low {
            color: #95a5a6;
        }
        
        .severity-info {
            color: #3498db;
        }
        
        .page-break {
            page-break-before: always;
        }
        
        .no-break {
            page-break-inside: avoid;
        }
        
        .summary-box {
            background-color: #f8f9fa;
            border: 1px solid #dee2e6;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
        }
        
        .finding {
            margin-bottom: 30px;
            border: 1px solid #e9ecef;
            border-radius: 8px;
            padding: 20px;
            page-break-inside: avoid;
        }
        
        .finding-header {
            border-bottom: 1px solid #dee2e6;
            padding-bottom: 10px;
            margin-bottom: 15px;
        }
        
        @media print {
            body {
                margin: 0;
                padding: 15px;
            }
            
            .page-break {
                page-break-before: always;
            }
        }
    </style>
</head>
<body>
    ${this.addSeverityClasses(html)}
</body>
</html>`;
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
