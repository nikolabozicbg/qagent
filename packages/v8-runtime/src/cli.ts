import * as fs from 'fs';
import * as path from 'path';
import { chromium } from 'playwright';
import type { V8BatchExecutionMapping, V8ExecutionMapping, V8Report, UiReadyOutput } from './types';
import { executeOneGoal } from './executor';
import { executeBatchGoals } from './batch';

function arg(name: string): string | undefined {
  const idx = process.argv.indexOf(name);
  if (idx === -1) return undefined;
  return process.argv[idx + 1];
}

function requireArg(name: string): string {
  const v = arg(name);
  if (!v) throw new Error(`Missing required arg: ${name}`);
  return v;
}

function readJson<T>(p: string): T {
  const raw = fs.readFileSync(p, 'utf8');
  return JSON.parse(raw) as T;
}

function writeJson(p: string, obj: any) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(obj, null, 2));
}

async function main() {
  const baseUrl = requireArg('--baseUrl');
  const goalsPath = requireArg('--goals');
  const outPath = requireArg('--out');

  const mappingPath = requireArg('--mapping');
  const reportOutPath = arg('--reportOut');

  const input = readJson<any>(goalsPath);
  const derivedUserGoals = (input.derivedUserGoals || input.goals || []) as Array<{
    id: string;
    startUserActionId: string;
    terminalNodeId: string;
  }>;

  const mapping = readJson<any>(mappingPath);

  const browser = await chromium.launch({ headless: true });
  try {
    // Batch mode if mapping declares batch.goalIds
    if (mapping && mapping.version === 'v8-mapping-1' && mapping.batch && Array.isArray(mapping.batch.goalIds)) {
      const result = await executeBatchGoals({
        browser,
        baseUrl,
        derivedUserGoals,
        mapping: mapping as V8BatchExecutionMapping,
        reportSource: reportOutPath || 'v8-report.batch.json',
      });

      if (reportOutPath) {
        writeJson(reportOutPath, result.v8Report);
      }

      writeJson(outPath, result);
      return;
    }

    // Backward-compatible single-goal mode
    const goalId = requireArg('--goalId');
    const goal = derivedUserGoals.find(g => g.id === goalId);
    if (!goal) {
      const report: V8Report = {
        verifiedGoals: [],
        unverifiedGoals: [{ goalId, reason: 'GOAL_NOT_FOUND' }],
      };
      writeJson(outPath, report);
      return;
    }

    const report = await executeOneGoal({ browser, baseUrl, goal, mapping: mapping as V8ExecutionMapping });
    if (reportOutPath) writeJson(reportOutPath, report);
    writeJson(outPath, report);
  } finally {
    await browser.close().catch(() => undefined);
  }
}

main().catch(err => {
  // Strict: output must be JSON only in normal operation; CLI errors go to stderr.
  console.error(err);
  process.exit(1);
});
