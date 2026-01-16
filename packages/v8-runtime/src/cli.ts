import * as fs from 'fs';
import * as path from 'path';
import { chromium } from 'playwright';
import type { V8ExecutionMapping, V8InputFile, V8Report } from './types';
import { executeOneGoal } from './executor';

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
  const goalId = requireArg('--goalId');
  const outPath = requireArg('--out');
  const mappingPath = arg('--mapping');

  const input = readJson<any>(goalsPath);
  const derivedUserGoals = (input.derivedUserGoals || input.goals || []) as Array<{
    id: string;
    startUserActionId: string;
    terminalNodeId: string;
  }>;

  const goal = derivedUserGoals.find(g => g.id === goalId);
  if (!goal) {
    const report: V8Report = {
      verifiedGoals: [],
      unverifiedGoals: [{ goalId, reason: 'GOAL_NOT_FOUND' }],
    };
    writeJson(outPath, report);
    return;
  }

  const mapping = mappingPath ? readJson<V8ExecutionMapping>(mappingPath) : undefined;

  const browser = await chromium.launch({ headless: true });
  try {
    const report = await executeOneGoal({ browser, baseUrl, goal, mapping });
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
