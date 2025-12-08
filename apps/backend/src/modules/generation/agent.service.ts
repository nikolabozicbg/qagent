import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { TestEnforcementService } from './test-enforcement.service';

// Tool definitions
interface Tool {
  name: string;
  description: string;
  parameters: Record<string, any>;
}

const AGENT_TOOLS: Tool[] = [
  {
    name: 'execute_command',
    description: 'Execute a shell command in the terminal',
    parameters: {
      type: 'object',
      properties: {
        command: { type: 'string', description: 'The shell command to execute' },
        cwd: { type: 'string', description: 'Working directory (optional)' }
      },
      required: ['command']
    }
  },
  {
    name: 'create_file',
    description: 'Create a new file with content',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'File path relative to workspace' },
        content: { type: 'string', description: 'File content' }
      },
      required: ['path', 'content']
    }
  },
  {
    name: 'edit_file',
    description: 'Edit an existing file (replace, insert, or delete)',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'File path' },
        operation: { 
          type: 'string', 
          enum: ['replace', 'insert', 'delete'],
          description: 'Type of edit operation'
        },
        search: { type: 'string', description: 'Text to find (for replace/delete)' },
        replacement: { type: 'string', description: 'Replacement text (for replace/insert)' }
      },
      required: ['path', 'operation']
    }
  },
  {
    name: 'read_file',
    description: 'Read contents of a file',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'File path' }
      },
      required: ['path']
    }
  },
  {
    name: 'list_directory',
    description: 'List files and folders in a directory',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Directory path' }
      },
      required: ['path']
    }
  },
  {
    name: 'ask_user',
    description: 'Ask the user for clarification or input',
    parameters: {
      type: 'object',
      properties: {
        question: { type: 'string', description: 'Question to ask' }
      },
      required: ['question']
    }
  },
  {
    name: 'task_complete',
    description: 'Mark the task as completed',
    parameters: {
      type: 'object',
      properties: {
        summary: { type: 'string', description: 'Summary of what was accomplished' }
      },
      required: ['summary']
    }
  }
];

export interface AgentMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_calls?: any[];
  tool_call_id?: string;
  name?: string;
}

@Injectable()
export class AgentService {
  private client: OpenAI;

  constructor(
    private configService: ConfigService,
    private enforcementService: TestEnforcementService
  ) {
    // Initialize OpenAI client lazily to avoid premature config access
  }

  private getClient(): OpenAI {
    if (!this.client) {
      const apiKey = this.configService.get<string>('openai.apiKey');
      this.client = new OpenAI({
        apiKey: apiKey || 'sk-mock',
      });
    }
    return this.client;
  }

  async executeAgentLoop({ 
    userQuery, 
    context, 
    maxIterations = 10 
  }: {
    userQuery: string;
    context?: any;
    maxIterations?: number;
  }) {
    console.log(`🤖 Agent starting: "${userQuery}"`);
    console.log(`🔍 Context received:`);
    console.log(`  Frameworks:`, JSON.stringify(context?.frameworks || {}));
    console.log(`  Current file:`, context?.currentFile);
    console.log(`  Has E2E framework:`, context?.frameworks?.e2e?.name);
    
    const apiKey = this.configService.get<string>('openai.apiKey');
    const hasValidKey = apiKey && apiKey !== 'sk-your-api-key-here';
    
    if (!hasValidKey) {
      return {
        success: false,
        error: 'OpenAI API key not configured',
        actions: []
      };
    }

    const messages: AgentMessage[] = [
      {
        role: 'system',
        content: this.getSystemPrompt(context)
      },
      {
        role: 'user',
        content: this.buildUserPrompt(userQuery, context)
      }
    ];

    const actions: any[] = [];
    let iteration = 0;
    let isComplete = false;

    while (iteration < maxIterations && !isComplete) {
      iteration++;
      console.log(`\n📍 Agent iteration ${iteration}/${maxIterations}`);

      try {
        // Call OpenAI with function calling
        const client = this.getClient();
        const response = await client.chat.completions.create({
          model: 'gpt-4-turbo-preview',
          messages: messages as any,
          tools: AGENT_TOOLS.map(tool => ({
            type: 'function',
            function: {
              name: tool.name,
              description: tool.description,
              parameters: tool.parameters
            }
          })),
          tool_choice: 'auto',
          temperature: 0.7
        });

        const assistantMessage = response.choices[0].message;
        messages.push(assistantMessage as any);

        // Check if agent wants to call tools
        if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
          for (const toolCall of assistantMessage.tool_calls) {
            const toolFunc = (toolCall as any).function;
            const toolName = toolFunc.name;
            const toolArgs = JSON.parse(toolFunc.arguments);

            console.log(`🔧 Tool call: ${toolName}`, toolArgs);

            // Record action
            actions.push({
              tool: toolName,
              arguments: toolArgs,
              timestamp: new Date().toISOString()
            });

            // Check if task is complete
            if (toolName === 'task_complete') {
              isComplete = true;
              console.log(`✅ Task completed: ${toolArgs.summary}`);
              
              messages.push({
                role: 'tool',
                tool_call_id: toolCall.id,
                name: toolName,
                content: JSON.stringify({ status: 'success', message: 'Task marked as complete' })
              });
              
              break;
            }

            // Simulate tool execution (actual execution happens in VS Code extension)
            let toolResult = this.simulateToolExecution(toolName, toolArgs);
            
            // ENFORCEMENT LAYER: If creating a test file, validate and auto-correct
            console.log(`📝 Tool: ${toolName}, Path: ${toolArgs.path || 'N/A'}`);
            
            if (toolName === 'create_file') {
              const isTest = this.isTestFile(toolArgs.path);
              console.log(`  ├─ Is test file: ${isTest}`);
              
              if (isTest) {
                const framework = this.detectFrameworkFromContext(context, toolArgs.path);
                console.log(`  ├─ Detected framework: ${framework || 'NONE'}`);
                console.log(`  ├─ Context query: "${context?.query || 'N/A'}"`);
                console.log(`  ├─ Context currentFile: "${context?.currentFile || 'N/A'}"`);
                console.log(`  └─ Context frameworks:`, JSON.stringify(context?.frameworks || {}));
                
                if (framework) {
                  console.log(`🛡️  Enforcing ${framework} rules on generated test...`);
                  console.log(`  Code preview (first 200 chars):`, toolArgs.content.substring(0, 200));
                  
                  const enforcement = this.enforcementService.enforce(
                    toolArgs.content,
                    framework,
                    context?.fileName || toolArgs.path
                  );
                  
                  console.log(`  Enforcement result:`);
                  console.log(`    ├─ Is valid: ${enforcement.isValid}`);
                  console.log(`    ├─ Applied: ${enforcement.enforcementApplied}`);
                  console.log(`    └─ Violations: ${enforcement.violations.length}`);
                  
                  if (enforcement.enforcementApplied) {
                    console.log(`⚠️  ENFORCEMENT APPLIED - violations:`, enforcement.violations);
                    console.log(`  Corrected code preview (first 200 chars):`, enforcement.correctedCode.substring(0, 200));
                    toolArgs.content = enforcement.correctedCode;
                    toolResult.message = `File ${toolArgs.path} will be created (enforcement applied)`;
                    toolResult.enforcement = {
                      applied: true,
                      violations: enforcement.violations
                    };
                  } else {
                    console.log(`✅ Code is already valid for ${framework}`);
                  }
                } else {
                  console.log(`⚠️  WARNING: Could not detect framework for test file!`);
                }
              }
            }

            messages.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              name: toolName,
              content: JSON.stringify(toolResult)
            });
          }
        } else {
          // No tool calls, agent is reasoning or done
          console.log(`💭 Agent: ${assistantMessage.content}`);
          
          if (assistantMessage.content?.toLowerCase().includes('complete') ||
              assistantMessage.content?.toLowerCase().includes('done')) {
            isComplete = true;
          }
        }

      } catch (error) {
        console.error('❌ Agent loop error:', error.message);
        return {
          success: false,
          error: error.message,
          actions,
          iterations: iteration
        };
      }
    }

    console.log(`\n🏁 Agent finished after ${iteration} iterations`);

    return {
      success: isComplete,
      actions,
      iterations: iteration,
      messages
    };
  }

  private getSystemPrompt(context?: any): string {
    let frameworkInfo = '';
    
    // CRITICAL: Check if this is E2E test mode FIRST
    const isE2EMode = context?.frameworks?.e2e?.name === 'playwright';
    if (isE2EMode) {
      frameworkInfo = `\n\n🚨🚨🚨 CRITICAL ALERT: E2E TEST MODE ACTIVE 🚨🚨🚨\n`;
      frameworkInfo += `You MUST generate a Playwright E2E test.\n`;
      frameworkInfo += `DO NOT use React Testing Library.\n`;
      frameworkInfo += `DO NOT import components.\n`;
      frameworkInfo += `Use ONLY: import { test, expect } from '@playwright/test';\n`;
      frameworkInfo += `Use page.goto() and page.getByRole() for browser testing.\n`;
      frameworkInfo += `🚨🚨🚨 E2E MODE - NO EXCEPTIONS 🚨🚨🚨\n`;
    }
    
    // Include detected frameworks if available
    if (context?.frameworks) {
      const { unit, e2e, component } = context.frameworks;
      
      if (unit) {
        frameworkInfo += `\n\n🧪 DETECTED UNIT TEST FRAMEWORK: ${unit.name} v${unit.version}`;
        if (unit.configFile) {
          frameworkInfo += ` (config: ${unit.configFile})`;
        }
        frameworkInfo += `\n   Use ${unit.name} syntax and best practices for unit tests.`;
        
        // Add framework-specific import examples
        if (unit.name === 'jest') {
          frameworkInfo += `\n\n   JEST IMPORT EXAMPLES:`;
          frameworkInfo += `\n   ✅ import { Test, TestingModule } from '@nestjs/testing'; // NestJS`;
          frameworkInfo += `\n   ✅ import { describe, it, expect, beforeEach } from '@jest/globals';`;
          frameworkInfo += `\n   ✅ import { YourService } from './your-service'; // Same directory`;
          frameworkInfo += `\n   ✅ import { SharedUtil } from '../shared/util'; // Parent directory`;
        } else if (unit.name === 'vitest') {
          frameworkInfo += `\n\n   VITEST IMPORT EXAMPLES:`;
          frameworkInfo += `\n   ✅ import { describe, it, expect, beforeEach } from 'vitest';`;
          frameworkInfo += `\n   ✅ import { YourComponent } from './your-component';`;
        }
      }
      
      if (e2e) {
        frameworkInfo += `\n\n🌐 DETECTED E2E FRAMEWORK: ${e2e.name} v${e2e.version}`;
        if (e2e.configFile) {
          frameworkInfo += ` (config: ${e2e.configFile})`;
        }
        frameworkInfo += `\n   Use ${e2e.name} syntax and best practices for E2E tests.`;
        
        if (e2e.name === 'playwright') {
          frameworkInfo += `\n\n   PLAYWRIGHT E2E RULES (CRITICAL - MUST FOLLOW):`;
          frameworkInfo += `\n   ✅ ONLY import from '@playwright/test' - NO other test libraries`;
          frameworkInfo += `\n   ✅ Example: import { test, expect } from '@playwright/test';`;
          frameworkInfo += `\n   ✅ Use page.goto(url) to navigate - NOT component imports`;
          frameworkInfo += `\n   ✅ Use page.getByRole(), page.getByText(), page.locator() for elements`;
          frameworkInfo += `\n   ✅ Test describes use: test.describe('Page E2E', () => { ... })`;
          frameworkInfo += `\n   ✅ Individual tests: test('description', async ({ page }) => { ... })`;
          frameworkInfo += `\n   ✅ Test file extension: .spec.ts or .spec.tsx`;
          frameworkInfo += `\n   ✅ Test location: tests/e2e/ folder`;
          frameworkInfo += `\n\n   ❌ FORBIDDEN IN PLAYWRIGHT E2E:`;
          frameworkInfo += `\n   ❌ NEVER: import { render } from '@testing-library/react'`;
          frameworkInfo += `\n   ❌ NEVER: import { screen } from '@testing-library/react'`;
          frameworkInfo += `\n   ❌ NEVER: import ComponentName from './path/to/component'`;
          frameworkInfo += `\n   ❌ NEVER: render(<ComponentName />)`;
          frameworkInfo += `\n   ❌ NEVER: jest.mock() - Playwright doesn't use Jest`;
          frameworkInfo += `\n   ❌ NEVER: import hooks like useScrollReveal`;
          frameworkInfo += `\n\n   PLAYWRIGHT E2E EXAMPLE (CORRECT):`;
          frameworkInfo += `\n   import { test, expect } from '@playwright/test';`;
          frameworkInfo += `\n   `;
          frameworkInfo += `\n   test.describe('Home Page E2E', () => {`;
          frameworkInfo += `\n     test('displays all sections', async ({ page }) => {`;
          frameworkInfo += `\n       await page.goto('/');`;
          frameworkInfo += `\n       await expect(page.getByRole('heading', { name: /hero/i })).toBeVisible();`;
          frameworkInfo += `\n       await expect(page.getByText(/metrics/i)).toBeVisible();`;
          frameworkInfo += `\n     });`;
          frameworkInfo += `\n   });`;
        }
      }
      
      if (component) {
        frameworkInfo += `\n\n⚛️  DETECTED COMPONENT LIBRARY: ${component.name} v${component.version}`;
        frameworkInfo += `\n   Use ${component.name} for component testing.`;
      }
      
      frameworkInfo += `\n\nIMPORTANT: Always generate tests using the detected framework syntax!\nDo NOT use other frameworks. The project already has these frameworks installed.`;
    }
    
    return `You are QAgenAI, an autonomous AI agent that helps developers with testing tasks.${frameworkInfo}

You have access to tools to:
- execute_command: Run shell commands (npm, mkdir, git, etc.)
- create_file: Create new files with content
- edit_file: Modify existing files
- read_file: Read file contents
- list_directory: List files in a directory
- ask_user: Ask for clarification (ONLY when truly needed)
- task_complete: MARK TASK AS COMPLETE (REQUIRED)

Your workflow:
1. Understand the user's request
2. Plan your approach (think about what tools to use)
3. Execute tools one at a time
4. After completing all work, IMMEDIATELY call task_complete

IMPORTANT RULES FOR ask_user:
- DO NOT use ask_user if file content is already provided in the prompt
- DO NOT use ask_user for information you can infer from context
- ONLY use ask_user for genuine ambiguities or missing critical information

CRITICAL RULES:
- ALWAYS call task_complete as your FINAL action
- Do NOT wait for additional confirmation
- Do NOT ask if the task is complete - just call task_complete
- If you create files or run commands successfully, call task_complete immediately after
- The summary parameter should briefly describe what you accomplished
- When generating tests, use the detected framework (see above)

Example flow:
1. create_file (package.json)
2. create_file (test.js)
3. execute_command (npm install)
4. task_complete (summary: "Created test framework with 2 test files and installed dependencies")

Remember: ALWAYS END WITH task_complete!`;
  }

  private buildUserPrompt(query: string, context?: any): string {
    let prompt = `User Request: ${query}\n`;
    
    if (context?.currentFile) {
      prompt += `\n\n📄 SOURCE FILE LOCATION:\nFull path: ${context.currentFile}`;
      
      const path = require('path');
      const sourceDir = path.dirname(context.currentFile);
      const sourceFileName = path.basename(context.currentFile);
      const sourceFileExt = path.extname(context.currentFile);
      const sourceBaseName = path.basename(context.currentFile, sourceFileExt);
      
      prompt += `\nDirectory: ${sourceDir}`;
      prompt += `\nFile name: ${sourceFileName}`;
      
      // Detect test type and framework
      const testTypeInfo = this.detectTestType(query, sourceDir, context?.frameworks);
      const { isE2ETest, hasPlaywright } = testTypeInfo;
      
      const testFileName = `${sourceBaseName}.spec${sourceFileExt}`;
      let testFilePath = path.join(sourceDir, testFileName);
      
      // If E2E test, try to place it in the e2e directory at project root
      if (isE2ETest && hasPlaywright) {
        try {
          const fs = require('fs');
          let currentDir = sourceDir;
          const root = path.parse(currentDir).root;
          let projectRoot = sourceDir;
          
          // Find project root (package.json)
          while (currentDir && currentDir !== root) {
            if (fs.existsSync(path.join(currentDir, 'package.json'))) {
              projectRoot = currentDir;
              break;
            }
            currentDir = path.dirname(currentDir);
          }
          
          // Construct e2e path
          const e2eDir = path.join(projectRoot, 'e2e');
          // Only use e2e dir if we found project root, otherwise stick to default or workspace root
          if (projectRoot !== sourceDir || fs.existsSync(e2eDir)) {
             testFilePath = path.join(e2eDir, testFileName);
          } else if (context?.workspaceRoot) {
             testFilePath = path.join(context.workspaceRoot, 'e2e', testFileName);
          }
        } catch (e) {
          // Fallback to source dir if filesystem access fails
          console.warn('Could not detect project root for E2E path:', e);
        }
      }
      
      if (isE2ETest && hasPlaywright) {
        // Generate Playwright E2E test instructions
        prompt += `\n\n🚨 🚨 🚨 E2E TEST MODE - PLAYWRIGHT ONLY 🚨 🚨 🚨`;
        prompt += `\n\n⚠️  CRITICAL: This is NOT a component test. This is an E2E test.`;
        prompt += `\n⚠️  You MUST use Playwright API, NOT React Testing Library.`;
        prompt += `\n⚠️  You will test the RUNNING application in a real browser.`;
        prompt += `\n\n🧪 TEST FILE INSTRUCTIONS:`;
        prompt += `\n- Create E2E test file at: ${testFilePath}`;
        prompt += `\n- Test file name: ${testFileName}`;
        prompt += `\n- Framework: Playwright (E2E testing framework)`;
        prompt += `\n\n✅ REQUIRED PLAYWRIGHT PATTERNS:`;
        prompt += `\n1. Import ONLY from Playwright:`;
        prompt += `\n   import { test, expect } from '@playwright/test';`;
        prompt += `\n\n2. Use test.describe() for test suites:`;
        prompt += `\n   test.describe('Page Name E2E', () => { ... });`;
        prompt += `\n\n3. Use test() with async page fixture:`;
        prompt += `\n   test('test description', async ({ page }) => { ... });`;
        prompt += `\n\n4. Navigate with page.goto():`;
        prompt += `\n   await page.goto('/'); // or '/privacy', '/about', etc.`;
        prompt += `\n\n5. Find elements with Playwright locators:`;
        prompt += `\n   await page.getByRole('heading', { name: 'Title' })`;
        prompt += `\n   await page.getByText('Some text')`;
        prompt += `\n   await page.locator('.css-selector')`;
        prompt += `\n\n6. Assert with Playwright expect:`;
        prompt += `\n   await expect(page.getByRole('button')).toBeVisible();`;
        prompt += `\n   await expect(page).toHaveURL('/expected-url');`;
        prompt += `\n\nPLAYWRIGHT E2E EXAMPLE (FOLLOW THIS PATTERN):`;
        prompt += `\n\`\`\`typescript`;
        prompt += `\nimport { test, expect } from '@playwright/test';`;
        prompt += `\n`;
        prompt += `\ntest.describe('Home Page E2E', () => {`;
        prompt += `\n  test('should display hero section', async ({ page }) => {`;
        prompt += `\n    await page.goto('/');`;
        prompt += `\n    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();`;
        prompt += `\n  });`;
        prompt += `\n  `;
        prompt += `\n  test('should navigate to features', async ({ page }) => {`;
        prompt += `\n    await page.goto('/');`;
        prompt += `\n    await page.getByRole('link', { name: /features/i }).click();`;
        prompt += `\n    await expect(page).toHaveURL(/.*features/);`;
        prompt += `\n  });`;
        prompt += `\n});`;
        prompt += `\n\`\`\``;
        prompt += `\n\n❌ ❌ ❌ ABSOLUTELY FORBIDDEN IN PLAYWRIGHT E2E ❌ ❌ ❌`;
        prompt += `\n\nDO NOT use any of these (they are for component tests, NOT E2E):`;
        prompt += `\n❌ import { render } from '@testing-library/react'`;
        prompt += `\n❌ import { screen } from '@testing-library/react'`;
        prompt += `\n❌ import HomePage from './page' (or any component import)`;
        prompt += `\n❌ import * as useScrollRevealModule from '../hooks/...'`;
        prompt += `\n❌ render(<HomePage />)`;
        prompt += `\n❌ screen.getByText(...)`;
        prompt += `\n❌ jest.mock(...)`;
        prompt += `\n❌ expect(HeroSection).toBeCalled() (this makes no sense in E2E)`;
        prompt += `\n\nIf you use ANY of the above patterns, the test is WRONG and will NOT work.`;
        prompt += `\nPlaywright tests the BROWSER, not React components directly.`;
      } else {
        // Generate unit/component test instructions
        prompt += `\n\n🧪 TEST FILE INSTRUCTIONS:`;
        prompt += `\n- Create test file at: ${testFilePath}`;
        prompt += `\n- Test file name: ${testFileName}`;
        prompt += `\n- Since test and source are in the SAME directory, use: import { ... } from './${sourceBaseName}'`;
        prompt += `\n- NEVER use absolute-style paths like './src/...' - calculate relative paths from test file location`;
        prompt += `\n\nIMPORT PATH RULES:`;
        prompt += `\n✅ CORRECT: import { MyService } from './${sourceBaseName}' (same directory)`;
        prompt += `\n✅ CORRECT: import { Test } from '@nestjs/testing' (npm package)`;
        prompt += `\n❌ WRONG: import { MyService } from './src/modules/...' (never use absolute-style paths)`;
        prompt += `\n❌ WRONG: import { MyService } from './${sourceFileName}' (don't include file extension)`;
      }
    }
    
    if (context?.code) {
      prompt += `\n\n📝 FILE CONTENT:\n\`\`\`${context.language || 'typescript'}\n${context.code}\n\`\`\`\n`;
      prompt += `\n⚠️ IMPORTANT: The file content is provided above. DO NOT use ask_user or read_file tools - analyze the code directly!`;
    }
    
    if (context?.workspaceRoot) {
      prompt += `\n\n📁 Workspace root: ${context.workspaceRoot}`;
    }
    
    return prompt;
  }

  /**
   * Detect test type from query and context
   */
  private detectTestType(query: string, sourceDir: string, frameworks?: any): {
    isE2ETest: boolean;
    isIntegrationTest: boolean;
    hasPlaywright: boolean;
    testType: 'unit' | 'e2e' | 'integration';
  } {
    const queryLower = query.toLowerCase();
    
    // Detect E2E from query keywords
    const isE2EFromQuery = queryLower.includes('e2e') || 
                           queryLower.includes('end-to-end') || 
                           queryLower.includes('end to end') ||
                           queryLower.includes('playwright');
    
    // Detect E2E from folder structure
    const isE2EFromFolder = sourceDir.includes('/e2e') || 
                            sourceDir.includes('\\e2e') || 
                            sourceDir.includes('/tests/e2e') || 
                            sourceDir.includes('\\tests\\e2e');
    
    // Detect integration tests
    const isIntegrationFromQuery = queryLower.includes('integration');
    const isIntegrationFromFolder = sourceDir.includes('/integration') || 
                                     sourceDir.includes('\\integration');
    
    const isE2ETest = isE2EFromQuery || isE2EFromFolder;
    const isIntegrationTest = isIntegrationFromQuery || isIntegrationFromFolder;
    const hasPlaywright = frameworks?.e2e?.name === 'playwright';
    
    // Determine primary test type
    let testType: 'unit' | 'e2e' | 'integration' = 'unit';
    if (isE2ETest) testType = 'e2e';
    else if (isIntegrationTest) testType = 'integration';
    
    return { isE2ETest, isIntegrationTest, hasPlaywright, testType };
  }
  
  private simulateToolExecution(toolName: string, args: any): any {
    // Simulate successful execution - actual execution happens in VS Code extension
    switch (toolName) {
      case 'execute_command':
        return {
          status: 'success',
          stdout: 'Command queued for execution',
          stderr: '',
          command: args.command
        };
      
      case 'create_file':
        return {
          status: 'success',
          path: args.path,
          message: `File ${args.path} will be created`
        };
      
      case 'edit_file':
        return {
          status: 'success',
          path: args.path,
          message: `File ${args.path} will be edited`
        };
      
      case 'read_file':
        return {
          status: 'success',
          path: args.path,
          content: '// File content will be available after execution',
          size: 0
        };
      
      case 'list_directory':
        return {
          status: 'success',
          path: args.path,
          files: [],
          directories: [],
          total: 0
        };
      
      case 'ask_user':
        return {
          status: 'pending',
          message: 'User input required',
          question: args.question
        };
      
      default:
        return {
          status: 'error',
          message: `Unknown tool: ${toolName}`
        };
    }
  }

  /**
   * Check if a file path is a test file
   */
  private isTestFile(filePath: string): boolean {
    if (!filePath) return false;
    const lowerPath = filePath.toLowerCase();
    return (
      lowerPath.includes('.spec.') ||
      lowerPath.includes('.test.') ||
      lowerPath.includes('_test.') ||
      lowerPath.endsWith('_test.go') ||
      lowerPath.endsWith('test.java') ||
      lowerPath.includes('/tests/') ||
      lowerPath.includes('/test/')
    );
  }

  /**
   * Detect framework from context based on folder structure and file patterns
   */
  private detectFrameworkFromContext(context?: any, testFilePath?: string): string | null {
    if (!context) return null;
    
    // Check if E2E test (Playwright)
    const testTypeInfo = this.detectTestType(
      context.query || '',
      context.currentFile || '',
      context.frameworks
    );
    
    // Fix: Trust E2E detection from query/folder even if frameworks config is missing
    if (testTypeInfo.isE2ETest) {
      // If explicitly configured or detected as E2E, default to Playwright
      return 'playwright';
    }
    
    // Check explicit frameworks from context
    if (context.frameworks) {
      if (context.frameworks.unit?.name === 'jest') return 'jest';
      if (context.frameworks.unit?.name === 'vitest') return 'vitest';
      if (context.frameworks.e2e?.name === 'playwright') return 'playwright';
    }
    
    // Check test file path patterns if available
    if (testFilePath) {
      const lowerTestPath = testFilePath.toLowerCase();
      if (lowerTestPath.includes('.spec.') && (lowerTestPath.endsWith('.ts') || lowerTestPath.endsWith('.tsx') || lowerTestPath.endsWith('.js'))) {
        return 'playwright';
      }
    }
    
    // Fallback: detect from file extension and patterns
    const filePath = context.currentFile || '';
    if (filePath.endsWith('.py')) return 'pytest';
    if (filePath.endsWith('.go')) return 'go_testing';
    if (filePath.endsWith('.java')) return 'junit';
    
    // Default for TypeScript/JavaScript
    if (filePath.endsWith('.ts') || filePath.endsWith('.tsx') || 
        filePath.endsWith('.js') || filePath.endsWith('.jsx')) {
      // Prefer Vitest if in vite project, otherwise Jest
      return context.hasVite ? 'vitest' : 'jest';
    }
    
    return null;
  }

}
