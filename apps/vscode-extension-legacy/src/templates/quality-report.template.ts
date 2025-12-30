import { TestQualityReport } from '../services/test-quality-analyzer.service';
import { escapeHtml } from '../utils/html.utils';

/**
 * Generate HTML for the detailed quality report panel
 */
export function getQualityReportHtml(report: TestQualityReport): string {
    const scoreColor = report.overallScore >= 80 ? '#22c55e' : 
                      report.overallScore >= 60 ? '#eab308' : '#ef4444';
    
    const filesHtml = report.files.map(file => {
        const testsHtml = file.tests.map(test => {
            const statusIcon = test.status === 'good' ? '✓' : test.status === 'warning' ? '!' : '✗';
            const statusColor = test.status === 'good' ? '#22c55e' : test.status === 'warning' ? '#eab308' : '#ef4444';
            const issuesHtml = test.issues.map(issue => `
                <div style="padding: 4px 0 4px 24px; font-size: 12px; color: rgba(255,255,255,0.6);">
                    → ${escapeHtml(issue.message)}${issue.suggestion ? ` - <em>${escapeHtml(issue.suggestion)}</em>` : ''}
                </div>
            `).join('');
            
            return `
                <div style="padding: 8px 12px; border-bottom: 1px solid rgba(255,255,255,0.1);">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span style="color: ${statusColor}; font-weight: bold;">${statusIcon}</span>
                        <span style="flex: 1;">${escapeHtml(test.name)}</span>
                        <span style="font-size: 12px; color: rgba(255,255,255,0.5);">Line ${test.line}</span>
                        <span style="font-size: 12px; font-weight: 600; color: ${statusColor};">${test.score}%</span>
                    </div>
                    ${issuesHtml}
                </div>
            `;
        }).join('');
        
        const fileScoreColor = file.totalScore >= 80 ? '#22c55e' : file.totalScore >= 60 ? '#eab308' : '#ef4444';
        
        return `
            <div style="margin-bottom: 16px; background: rgba(255,255,255,0.03); border-radius: 8px; overflow: hidden;">
                <div style="padding: 12px 16px; background: rgba(255,255,255,0.05); display: flex; align-items: center; gap: 8px;">
                    <span style="font-weight: 600;">${escapeHtml(file.fileName)}</span>
                    <span style="font-size: 12px; color: rgba(255,255,255,0.5);">${file.tests.length} tests</span>
                    <span style="margin-left: auto; font-weight: 600; color: ${fileScoreColor};">${file.totalScore}%</span>
                </div>
                ${testsHtml}
            </div>
        `;
    }).join('');
    
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Test Quality Report</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            color: rgba(255,255,255,0.9);
            background: #1e1e1e;
            padding: 24px;
            line-height: 1.5;
        }
        .header {
            display: flex;
            align-items: center;
            gap: 20px;
            margin-bottom: 24px;
            padding-bottom: 16px;
            border-bottom: 1px solid rgba(255,255,255,0.1);
        }
        .score-circle {
            width: 80px;
            height: 80px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            font-weight: 700;
            color: ${scoreColor};
            border: 4px solid ${scoreColor};
        }
        .summary {
            display: flex;
            gap: 24px;
            margin-bottom: 24px;
        }
        .stat {
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .stat-num {
            font-size: 20px;
            font-weight: 700;
        }
        .stat-label {
            font-size: 12px;
            color: rgba(255,255,255,0.5);
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="score-circle">${report.overallScore}%</div>
        <div>
            <h1 style="margin: 0 0 8px 0; font-size: 20px;">Test Quality Report</h1>
            <p style="margin: 0; color: rgba(255,255,255,0.5);">${report.totalTests} tests in ${report.files.length} files</p>
        </div>
    </div>
    
    <div class="summary">
        <div class="stat">
            <span class="stat-num" style="color: #22c55e;">${report.goodTests}</span>
            <span class="stat-label">✓ Good tests</span>
        </div>
        <div class="stat">
            <span class="stat-num" style="color: #eab308;">${report.warningTests}</span>
            <span class="stat-label">! Warnings</span>
        </div>
        <div class="stat">
            <span class="stat-num" style="color: #ef4444;">${report.errorTests}</span>
            <span class="stat-label">✗ Errors</span>
        </div>
    </div>
    
    <h2 style="font-size: 14px; margin-bottom: 12px; color: rgba(255,255,255,0.7);">FILES</h2>
    ${filesHtml}
</body>
</html>`;
}
