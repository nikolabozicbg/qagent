import * as vscode from 'vscode';
import * as path from 'path';
import axios from 'axios';
import { CoverageTreeProvider } from '../coverageTreeProvider';
import { detectLanguage } from '../utils/language-detector';
import { getWebviewHtml } from '../utils/webview-html';
import { BackendApiService } from '../services/backend-api.service';

export class ChatPanelProvider implements vscode.WebviewViewProvider {
    private _view?: vscode.WebviewView;
    private chatHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [];
    private backendApi: BackendApiService;

    constructor(
        private readonly _extensionUri: vscode.Uri,
        private readonly coverageProvider: CoverageTreeProvider
    ) {
        this.backendApi = new BackendApiService();
    }

    public sendMessage(message: string) {
        if (this._view) {
            this.handleChatMessage(message);
        }
    }

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };

        webviewView.webview.html = getWebviewHtml(webviewView.webview);

        webviewView.webview.onDidReceiveMessage(async (data) => {
            console.log('🔵 Extension received message:', data.type);
            switch (data.type) {
                case 'sendMessage': {
                    console.log('💬 Handling chat message:', data.message);
                    await this.handleChatMessage(data.message);
                    break;
                }
                case 'applyCode': {
                    console.log('✅ Inserting code at cursor');
                    await this.applyCode(data.code);
                    break;
                }
                case 'replaceFile': {
                    console.log('📝 Replacing entire file content');
                    await this.replaceFile(data.code);
                    break;
                }
                case 'createFile': {
                    console.log('🆕 Creating new file');
                    await this.createFile(data.fileName, data.code);
                    break;
                }
                case 'clearHistory': {
                    console.log('🧹 Clearing history');
                    this.chatHistory = [];
                    this._view?.webview.postMessage({ type: 'historyCleared' });
                    break;
                }
                case 'executeAgentActions': {
                    console.log('🤖 Executing agent actions');
                    await this.executeAgentActions(data.actions);
                    break;
                }
                case 'previewDiff': {
                    console.log('👁️ Previewing diff');
                    await this.previewDiff(data.action);
                    break;
                }
            }
        });
    }

    private async handleChatMessage(message: string) {
        try {
            this.chatHistory.push({ role: 'user', content: message });

            this._view?.webview.postMessage({
                type: 'typing',
                isTyping: true
            });

            const editor = vscode.window.activeTextEditor;
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            const report = this.coverageProvider.getReport();
            const frameworks = report?.frameworks || {};
            
            const context = editor ? {
                code: editor.document.getText(),
                currentFile: editor.document.fileName,
                fileName: path.basename(editor.document.fileName),
                language: detectLanguage(path.extname(editor.document.fileName)),
                workspaceRoot: workspaceFolder?.uri.fsPath,
                frameworks
            } : workspaceFolder ? {
                workspaceRoot: workspaceFolder.uri.fsPath,
                frameworks
            } : undefined;

            console.log('🚀 Calling Agent endpoint');
            console.log('📦 Context:', { 
                hasCode: !!context?.code, 
                fileName: context?.fileName,
                hasFrameworks: !!context?.frameworks,
                frameworks: Object.keys(context?.frameworks || {})
            });

            const response = await this.backendApi.callAgent(message, context);
            
            console.log('✅ Agent response received:', {
                success: response.data.success,
                actionsCount: response.data.actions?.length || 0,
                iterations: response.data.iterations
            });

            const agentResult = response.data;
            const actions = agentResult.actions || [];
            const lastAssistantMsg = agentResult.messages
                ?.filter((m: any) => m.role === 'assistant')
                ?.pop();
            const reply = lastAssistantMsg?.content || 'Task completed';
            
            console.log('📝 Extracted reply:', reply.substring(0, 100) + '...');
            console.log('🎬 Actions:', actions.map((a: any) => a.tool));

            this.chatHistory.push({ role: 'assistant', content: reply });

            this._view?.webview.postMessage({
                type: 'typing',
                isTyping: false
            });

            this._view?.webview.postMessage({
                type: 'chatResponse',
                message: reply,
                actions: actions
            });
            
            if (actions.length > 0) {
                console.log(`🤖 Agent generated ${actions.length} actions (waiting for user approval)`);
                return;
            }

        } catch (error: any) {
            console.error('❌ Agent request failed:', error.message);
            console.error('Stack:', error.stack);
            
            this._view?.webview.postMessage({
                type: 'typing',
                isTyping: false
            });
            this._view?.webview.postMessage({
                type: 'error',
                error: error.message || 'Failed to send message'
            });
        }
    }

    private async applyCode(code: string) {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active editor');
            return;
        }

        await editor.edit(editBuilder => {
            const position = editor.selection.active;
            editBuilder.insert(position, code);
        });

        vscode.window.showInformationMessage('Code inserted!');
    }
    
    private async replaceFile(code: string, skipConfirmation: boolean = false) {
        console.log('📝 replaceFile called', { 
            codeLength: code.length, 
            skipConfirmation,
            codePreview: code.substring(0, 100)
        });
        
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            console.log('❌ No active editor');
            vscode.window.showErrorMessage('No active editor. Open a file first.');
            return;
        }
        
        console.log('✅ Editor found:', editor.document.fileName);

        if (!skipConfirmation) {
            const confirm = await vscode.window.showWarningMessage(
                `Replace entire content of ${path.basename(editor.document.fileName)}?`,
                { modal: true },
                'Replace',
                'Cancel'
            );

            if (confirm !== 'Replace') {
                console.log('❌ User cancelled replace');
                return;
            }
        } else {
            console.log('⚡ Skipping confirmation (auto-apply)');
        }

        try {
            console.log('🔧 Starting editor.edit...');
            const success = await editor.edit(editBuilder => {
                const fullRange = new vscode.Range(
                    editor.document.positionAt(0),
                    editor.document.positionAt(editor.document.getText().length)
                );
                console.log('📋 Replacing range:', fullRange);
                editBuilder.replace(fullRange, code);
            });
            
            console.log('✅ Edit success:', success);
            
            if (!success) {
                console.log('❌ Editor.edit returned false');
                vscode.window.showErrorMessage('Failed to apply changes');
                return;
            }

            const msg = skipConfirmation ? '🚀 Auto-applied file changes!' : '✅ File content replaced!';
            vscode.window.showInformationMessage(msg);
            console.log('✅ replaceFile completed successfully');
        } catch (error: any) {
            console.error('❌ Error in replaceFile:', error);
            vscode.window.showErrorMessage(`Error: ${error.message}`);
        }
    }
    
    private async createFile(fileName: string, code: string) {
        console.log('🆕 createFile called', { fileName, codeLength: code.length });
        
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No workspace open');
            return;
        }
        
        const workspaceFolder = vscode.workspace.getWorkspaceFolder(editor.document.uri);
        if (!workspaceFolder) {
            vscode.window.showErrorMessage('No workspace folder found');
            return;
        }
        
        const currentDir = path.dirname(editor.document.uri.fsPath);
        const newFilePath = path.join(currentDir, fileName);
        
        console.log('📁 New file path:', newFilePath);
        
        const fs = require('fs');
        if (fs.existsSync(newFilePath)) {
            const overwrite = await vscode.window.showWarningMessage(
                `File ${fileName} already exists. Overwrite?`,
                { modal: true },
                'Overwrite',
                'Cancel'
            );
            
            if (overwrite !== 'Overwrite') {
                console.log('❌ User cancelled overwrite');
                return;
            }
        }
        
        try {
            const parentDir = path.dirname(newFilePath);
            if (!fs.existsSync(parentDir)) {
                console.log('📁 Creating directory:', parentDir);
                fs.mkdirSync(parentDir, { recursive: true });
            }
            
            fs.writeFileSync(newFilePath, code, 'utf-8');
            console.log('✅ File created:', newFilePath);
            
            const doc = await vscode.workspace.openTextDocument(newFilePath);
            await vscode.window.showTextDocument(doc);
            
            vscode.window.showInformationMessage(`✅ Created ${fileName}`);
        } catch (error: any) {
            console.error('❌ Error creating file:', error);
            vscode.window.showErrorMessage(`Failed to create file: ${error.message}`);
        }
    }
    
    private async previewDiff(action: any) {
        const fs = require('fs');
        const os = require('os');
        const args = action.arguments;
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        const workspaceRoot = workspaceFolder?.uri.fsPath || '';
        const filePath = path.isAbsolute(args.path) ? args.path : path.join(workspaceRoot, args.path);
        
        let newContent = '';
        let leftUri: vscode.Uri;
        
        try {
            if (action.tool === 'create_file') {
                newContent = args.content;
                // For new files, compare against an empty file
                // We create a temp empty file for the left side
                const emptyFile = path.join(os.tmpdir(), `qagenai_empty_${Date.now()}`);
                fs.writeFileSync(emptyFile, '');
                leftUri = vscode.Uri.file(emptyFile);
            } else if (action.tool === 'edit_file') {
                if (fs.existsSync(filePath)) {
                    const originalContent = fs.readFileSync(filePath, 'utf-8');
                    // Apply the edit
                    newContent = originalContent.replace(args.search, args.replace);
                    leftUri = vscode.Uri.file(filePath);
                } else {
                    vscode.window.showErrorMessage(`File not found: ${filePath}`);
                    return;
                }
            } else {
                return;
            }

            // Create temp file for the new content (Right side)
            const tempFile = path.join(os.tmpdir(), `qagenai_preview_${path.basename(filePath)}`);
            fs.writeFileSync(tempFile, newContent);
            const rightUri = vscode.Uri.file(tempFile);
            
            const title = `Preview: ${path.basename(filePath)}`;
            await vscode.commands.executeCommand('vscode.diff', leftUri, rightUri, title);
            
        } catch (error: any) {
            console.error('❌ Error previewing diff:', error);
            vscode.window.showErrorMessage(`Failed to preview diff: ${error.message}`);
        }
    }

    private async executeAgentActions(actions: any[]) {
        console.log(`🚀 Executing ${actions.length} agent actions...`);
        
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            vscode.window.showErrorMessage('No workspace folder found');
            return;
        }
        
        const workspaceRoot = workspaceFolder.uri.fsPath;
        
        for (const action of actions) {
            const tool = action.tool;
            const args = action.arguments;
            
            console.log(`🔧 Executing tool: ${tool}`, args);
            
            try {
                switch (tool) {
                    case 'execute_command': {
                        const terminal = vscode.window.createTerminal('QAgenAI Agent');
                        terminal.show();
                        
                        if (args.working_directory) {
                            terminal.sendText(`cd ${args.working_directory}`);
                            await new Promise(resolve => setTimeout(resolve, 500));
                        }
                    
                        terminal.sendText(args.command);
                        await new Promise(resolve => setTimeout(resolve, 800));
                        break;
                    }
                    
                    case 'create_file': {
                        const fs = require('fs');
                        const filePath = path.isAbsolute(args.path) 
                            ? args.path 
                            : path.join(workspaceRoot, args.path);
                        
                        const parentDir = path.dirname(filePath);
                        if (!fs.existsSync(parentDir)) {
                            fs.mkdirSync(parentDir, { recursive: true });
                        }
                        
                        fs.writeFileSync(filePath, args.content, 'utf-8');
                        console.log(`📄 Created: ${args.path}`);
                        
                        const doc = await vscode.workspace.openTextDocument(filePath);
                        await vscode.window.showTextDocument(doc);
                        break;
                    }
                    
                    case 'edit_file': {
                        const fs = require('fs');
                        const filePath = path.isAbsolute(args.path) 
                            ? args.path 
                            : path.join(workspaceRoot, args.path);
                        
                        let content = fs.readFileSync(filePath, 'utf-8');
                        content = content.replace(args.search, args.replace);
                        fs.writeFileSync(filePath, content, 'utf-8');
                        console.log(`✏️  Edited: ${args.path}`);
                        break;
                    }
                    
                    case 'read_file': {
                        const fs = require('fs');
                        const filePath = path.isAbsolute(args.path) 
                            ? args.path 
                            : path.join(workspaceRoot, args.path);
                        
                        const content = fs.readFileSync(filePath, 'utf-8');
                        console.log(`📄 Read: ${args.path} (${content.length} chars)`);
                        break;
                    }
                    
                    case 'list_directory': {
                        const fs = require('fs');
                        const dirPath = path.isAbsolute(args.path) 
                            ? args.path 
                            : path.join(workspaceRoot, args.path);
                        
                        const entries = fs.readdirSync(dirPath);
                        console.log(`📁 Listed: ${args.path} (${entries.length} entries)`);
                        break;
                    }
                    
                    case 'ask_user': {
                        const answer = await vscode.window.showInputBox({
                            prompt: args.question,
                            placeHolder: 'Your answer...'
                        });
                        console.log(`❓ User answered: ${answer}`);
                        break;
                    }
                    
                    case 'task_complete': {
                        console.log(`✅ Task complete: ${args.summary}`);
                        vscode.window.showInformationMessage(`✅ ${args.summary}`);
                        break;
                    }
                    
                    default:
                        console.warn(`⚠️ Unknown tool: ${tool}`);
                }
            } catch (error: any) {
                console.error(`❌ Error executing ${tool}:`, error);
                vscode.window.showErrorMessage(`Error executing ${tool}: ${error.message}`);
            }
        }
        
        vscode.window.showInformationMessage(`✅ Executed ${actions.length} actions!`);
    }
}
