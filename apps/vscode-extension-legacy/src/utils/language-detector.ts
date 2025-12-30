import * as path from 'path';

export function detectLanguage(extension: string): string {
    const languageMap: { [key: string]: string } = {
        '.ts': 'typescript',
        '.tsx': 'typescript',
        '.js': 'javascript',
        '.jsx': 'javascript',
        '.py': 'python',
        '.go': 'go',
        '.java': 'java',
        '.rb': 'ruby',
        '.php': 'php'
    };
    return languageMap[extension] || 'unknown';
}

export function getTestFileName(fileName: string, extension: string): string {
    const nameWithoutExt = path.basename(fileName, extension);
    
    if (extension === '.py') {
        return `test_${nameWithoutExt}.py`;
    } else if (extension === '.go') {
        return `${nameWithoutExt}_test.go`;
    } else if (extension === '.rb') {
        return `${nameWithoutExt}_spec.rb`;
    } else {
        return `${nameWithoutExt}.test${extension}`;
    }
}
