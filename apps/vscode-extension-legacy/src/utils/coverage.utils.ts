import * as vscode from 'vscode';

/**
 * Coverage-related utility functions
 */

/**
 * Get icon name based on coverage percentage
 */
export function getCoverageIcon(percent: number): string {
    if (percent >= 80) return 'check-all'; // Excellent
    if (percent >= 60) return 'graph'; // Good
    if (percent >= 40) return 'graph-line'; // Fair
    return 'warning'; // Poor
}

/**
 * Get icon color based on coverage percentage
 */
export function getCoverageIconColor(percent: number): vscode.ThemeColor {
    if (percent >= 80) return new vscode.ThemeColor('testing.iconPassed');
    if (percent >= 60) return new vscode.ThemeColor('charts.blue');
    if (percent >= 40) return new vscode.ThemeColor('charts.orange');
    return new vscode.ThemeColor('testing.iconFailed');
}

/**
 * Get coverage status text
 */
export function getCoverageStatusText(percent: number): string {
    if (percent >= 80) return '✅ Excellent';
    if (percent >= 60) return '🟡 Good';
    if (percent >= 40) return '🟠 Fair';
    return '🔴 Poor';
}

/**
 * Get icon for priority level
 */
export function getIconForPriority(priority: string, hasTest: boolean): string {
    if (hasTest) {
        return 'check';
    }

    switch (priority) {
        case 'critical':
            return 'flame';
        case 'high':
            return 'alert';
        case 'medium':
            return 'warning';
        case 'low':
            return 'info';
        default:
            return 'file';
    }
}

/**
 * Get icon color for priority level
 */
export function getIconColor(priority: string, hasTest: boolean): vscode.ThemeColor | undefined {
    if (hasTest) {
        return new vscode.ThemeColor('testing.iconPassed');
    }

    switch (priority) {
        case 'critical':
            return new vscode.ThemeColor('testing.iconFailed');
        case 'high':
            return new vscode.ThemeColor('errorForeground');
        case 'medium':
            return new vscode.ThemeColor('editorWarning.foreground');
        case 'low':
            return new vscode.ThemeColor('editorInfo.foreground');
        default:
            return undefined;
    }
}

/**
 * Generate visual progress bar
 * Example: "60% ████████░░"
 */
export function getProgressBar(percent: number): string {
    const totalBlocks = 10;
    const filledBlocks = Math.round((percent / 100) * totalBlocks);
    const emptyBlocks = totalBlocks - filledBlocks;
    
    const filled = '█'.repeat(filledBlocks);
    const empty = '░'.repeat(emptyBlocks);
    
    return `${percent}% ${filled}${empty}`;
}
