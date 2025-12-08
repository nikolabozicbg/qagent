import { Injectable } from '@nestjs/common';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';

const execAsync = promisify(exec);

export interface RiskProfile {
  score: number; // 0-100
  priority: 'critical' | 'high' | 'medium' | 'low';
  reasons: string[];
  details: {
    churn: number;
    complexity: number;
    lastEdited: string;
  };
}

@Injectable()
export class RiskPrioritizerService {
  
  /**
   * Calculate risk profile for a file based on Churn, Complexity, and Criticality
   */
  async calculateRisk(filePath: string, workspacePath: string): Promise<RiskProfile> {
    const reasons: string[] = [];
    let score = 0;

    // 1. Git Churn Analysis (Dynamic Risk)
    const churn = await this.getGitChurn(filePath, workspacePath);
    const churnScore = Math.min(churn * 5, 40); // Cap at 40 points
    score += churnScore;
    
    if (churn > 10) {
      reasons.push(`High churn: ${churn} recent commits`);
    } else if (churn > 5) {
      reasons.push(`Moderate churn: ${churn} recent commits`);
    }

    // 2. Complexity Analysis (Static Risk)
    const loc = await this.countLines(filePath);
    const complexityScore = Math.min(Math.floor(loc / 10), 30); // Cap at 30 points (300 LOC)
    score += complexityScore;

    if (loc > 200) {
      reasons.push(`High complexity: ${loc} LOC`);
    }

    // 3. Business Criticality (Semantic Risk)
    const { criticalityScore, criticalityReasons } = this.analyzeCriticality(filePath);
    score += criticalityScore;
    reasons.push(...criticalityReasons);

    // 4. Recent Changes (Recency Bias)
    const daysSinceEdit = await this.getDaysSinceLastEdit(filePath, workspacePath);
    if (daysSinceEdit <= 2) {
      score += 10; // Bonus for "Freshly Broken"
      reasons.push('Recently edited (Active development)');
    }

    // Normalize Score (Cap at 100)
    score = Math.min(score, 100);

    return {
      score,
      priority: this.determinePriority(score),
      reasons,
      details: {
        churn,
        complexity: loc,
        lastEdited: `${daysSinceEdit} days ago`
      }
    };
  }

  private determinePriority(score: number): 'critical' | 'high' | 'medium' | 'low' {
    if (score >= 80) return 'critical';
    if (score >= 60) return 'high';
    if (score >= 40) return 'medium';
    return 'low';
  }

  private async getGitChurn(filePath: string, workspacePath: string): Promise<number> {
    try {
      // Get number of commits touching this file in last 30 days
      // relative path is safer for git commands
      const relativePath = path.relative(workspacePath, filePath);
      const { stdout } = await execAsync(
        `git log --since="30 days ago" --format=oneline -- "${relativePath}" | wc -l`,
        { cwd: workspacePath }
      );
      return parseInt(stdout.trim(), 10) || 0;
    } catch (e) {
      // Not a git repo or error
      return 0;
    }
  }

  private async getDaysSinceLastEdit(filePath: string, workspacePath: string): Promise<number> {
    try {
      const relativePath = path.relative(workspacePath, filePath);
      const { stdout } = await execAsync(
        `git log -1 --format=%cd --date=relative -- "${relativePath}"`,
        { cwd: workspacePath }
      );
      // Result is like "2 days ago" or "3 hours ago"
      const timeStr = stdout.trim();
      if (timeStr.includes('hour') || timeStr.includes('minute') || timeStr.includes('second')) {
        return 0;
      }
      const match = timeStr.match(/(\d+)\s+days?/);
      return match ? parseInt(match[1], 10) : 30; // Default to 30 if unknown
    } catch (e) {
      return 30;
    }
  }

  private async countLines(filePath: string): Promise<number> {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      return content.split('\n').filter(l => l.trim().length > 0).length;
    } catch (e) {
      return 0;
    }
  }

  private analyzeCriticality(filePath: string): { criticalityScore: number; criticalityReasons: string[] } {
    let score = 0;
    const reasons: string[] = [];
    const lowerPath = filePath.toLowerCase();
    const fileName = path.basename(filePath).toLowerCase();

    // Critical Business Logic
    if (fileName.includes('payment') || lowerPath.includes('billing') || lowerPath.includes('checkout')) {
      score += 30;
      reasons.push('Critical domain: Payments');
    }
    if (fileName.includes('auth') || lowerPath.includes('security') || fileName.includes('guard')) {
      score += 30;
      reasons.push('Critical domain: Security/Auth');
    }

    // Architecture Layer Priority
    if (fileName.includes('service') || fileName.includes('provider')) {
      score += 15;
      reasons.push('Core Service logic');
    }
    if (fileName.includes('controller') || fileName.includes('api')) {
      score += 10;
      reasons.push('Public API endpoint');
    }

    // Infrastructure
    if (fileName.includes('config') || fileName.includes('env')) {
      score += 20;
      reasons.push('Global Configuration');
    }

    return { criticalityScore: score, criticalityReasons: reasons };
  }
}
