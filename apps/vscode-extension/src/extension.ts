import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';

export function activate(context: vscode.ExtensionContext) {
    console.log('QAgenAI extension is now active!');

    // Chat panel provider
    const chatProvider = new ChatPanelProvider(context.extensionUri);

    // Register chat panel view
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider('qagenai.chatView', chatProvider)
    );

    // Command to open chat
    let chatCommand = vscode.commands.registerCommand('qagenai.openChat', () => {
        vscode.commands.executeCommand('qagenai.chatView.focus');
    });

    context.subscriptions.push(chatCommand);

    let disposable = vscode.commands.registerCommand('qagenai.generateTests', async (uri: vscode.Uri) => {
        try {
            // Get the file path
            const filePath = uri?.fsPath || vscode.window.activeTextEditor?.document.uri.fsPath;
            
            if (!filePath) {
                vscode.window.showErrorMessage('No file selected');
                return;
            }

            // Read file content
            const fileContent = fs.readFileSync(filePath, 'utf-8');
            const fileName = path.basename(filePath);
            const fileExtension = path.extname(filePath);

            // Show progress
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: 'QAgenAI: Generating tests...',
                cancellable: false
            }, async (progress) => {
                progress.report({ increment: 0, message: 'Analyzing code...' });

                // Get configuration
                const config = vscode.workspace.getConfiguration('qagenai');
                const apiUrl = config.get<string>('apiUrl') || 'http://localhost:3001';

                progress.report({ increment: 30, message: 'Calling AI...' });

                // Call backend API
                const response = await axios.post(`${apiUrl}/generate/tests`, {
                    code: fileContent,
                    fileName: fileName,
                    language: detectLanguage(fileExtension)
                }, {
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    timeout: 60000 // 60 seconds
                });

                progress.report({ increment: 60, message: 'Creating test file...' });

                const generatedTests = response.data.tests;

                // Determine test file name
                const testFileName = getTestFileName(fileName, fileExtension);
                const testFilePath = path.join(path.dirname(filePath), testFileName);

                // Write test file
                fs.writeFileSync(testFilePath, generatedTests, 'utf-8');

                progress.report({ increment: 100, message: 'Done!' });

                // Open the test file
                const doc = await vscode.workspace.openTextDocument(testFilePath);
                await vscode.window.showTextDocument(doc);

                vscode.window.showInformationMessage(`✅ Tests generated: ${testFileName}`);
            });

        } catch (error: any) {
            console.error('Error generating tests:', error);
            vscode.window.showErrorMessage(`Failed to generate tests: ${error.message}`);
        }
    });

    context.subscriptions.push(disposable);
}

export function deactivate() {}

// Chat Panel WebView Provider
class ChatPanelProvider implements vscode.WebviewViewProvider {
    private _view?: vscode.WebviewView;
    private chatHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [];

    constructor(private readonly _extensionUri: vscode.Uri) {}

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

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

        // Handle messages from webview
        webviewView.webview.onDidReceiveMessage(async (data) => {
            console.log('🔵 Extension received message:', data.type);
            switch (data.type) {
                case 'sendMessage': {
                    console.log('💬 Handling chat message:', data.message);
                    await this.handleChatMessage(data.message);
                    break;
                }
                case 'applyCode': {
                    console.log('✅ Applying code');
                    await this.applyCode(data.code);
                    break;
                }
                case 'clearHistory': {
                    console.log('🧹 Clearing history');
                    this.chatHistory = [];
                    this._view?.webview.postMessage({ type: 'historyCleared' });
                    break;
                }
            }
        });
    }

    private async handleChatMessage(message: string) {
        try {
            // Add user message to history
            this.chatHistory.push({ role: 'user', content: message });

            // Show typing indicator
            this._view?.webview.postMessage({
                type: 'typing',
                isTyping: true
            });

            // Get current file context
            const editor = vscode.window.activeTextEditor;
            const context = editor ? {
                code: editor.document.getText(),
                fileName: path.basename(editor.document.fileName),
                language: detectLanguage(path.extname(editor.document.fileName))
            } : undefined;

            // Call backend
            const config = vscode.workspace.getConfiguration('qagenai');
            const apiUrl = config.get<string>('apiUrl') || 'http://localhost:3001';

            const response = await axios.post(`${apiUrl}/generate/chat`, {
                message,
                context,
                history: this.chatHistory.slice(0, -1) // Don't send the current message again
            }, {
                headers: { 'Content-Type': 'application/json' },
                timeout: 60000
            });

            const reply = response.data.reply;

            // Add assistant message to history
            this.chatHistory.push({ role: 'assistant', content: reply });

            // Send response to webview
            this._view?.webview.postMessage({
                type: 'typing',
                isTyping: false
            });

            this._view?.webview.postMessage({
                type: 'chatResponse',
                message: reply
            });

        } catch (error: any) {
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
            // Insert at cursor position
            const position = editor.selection.active;
            editBuilder.insert(position, code);
        });

        vscode.window.showInformationMessage('Code applied!');
    }

    private _getHtmlForWebview(webview: vscode.Webview) {
        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>QAgenAI Chat</title>
            <style>
                * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                }

                body {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
                    background: var(--vscode-editor-background);
                    color: var(--vscode-editor-foreground);
                    height: 100vh;
                    display: flex;
                    flex-direction: column;
                }

                .header {
                    padding: 12px 16px;
                    border-bottom: 1px solid var(--vscode-panel-border);
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }

                .header h2 {
                    font-size: 14px;
                    font-weight: 600;
                    color: var(--vscode-foreground);
                }

                .clear-btn {
                    background: transparent;
                    border: 1px solid var(--vscode-button-border);
                    color: var(--vscode-button-foreground);
                    padding: 4px 8px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 12px;
                }

                .clear-btn:hover {
                    background: var(--vscode-button-hoverBackground);
                }

                .chat-container {
                    flex: 1;
                    overflow-y: auto;
                    padding: 16px;
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                }

                .message {
                    max-width: 85%;
                    padding: 10px 14px;
                    border-radius: 8px;
                    word-wrap: break-word;
                    line-height: 1.5;
                    font-size: 13px;
                }

                .message.user {
                    align-self: flex-end;
                    background: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
                }

                .message.assistant {
                    align-self: flex-start;
                    background: var(--vscode-input-background);
                    color: var(--vscode-input-foreground);
                    border: 1px solid var(--vscode-input-border);
                }

                .message pre {
                    background: var(--vscode-textCodeBlock-background);
                    padding: 8px;
                    border-radius: 4px;
                    overflow-x: auto;
                    margin: 8px 0;
                    font-size: 12px;
                }

                .message code {
                    background: var(--vscode-textCodeBlock-background);
                    padding: 2px 4px;
                    border-radius: 3px;
                    font-family: 'Courier New', monospace;
                    font-size: 12px;
                }

                .code-actions {
                    display: flex;
                    gap: 8px;
                    margin-top: 8px;
                }

                .code-action-btn {
                    background: var(--vscode-button-secondaryBackground);
                    color: var(--vscode-button-secondaryForeground);
                    border: none;
                    padding: 4px 10px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 11px;
                }

                .code-action-btn:hover {
                    background: var(--vscode-button-secondaryHoverBackground);
                }

                .typing-indicator {
                    align-self: flex-start;
                    padding: 10px 14px;
                    background: var(--vscode-input-background);
                    border-radius: 8px;
                    display: none;
                }

                .typing-indicator.active {
                    display: block;
                }

                .typing-dots {
                    display: flex;
                    gap: 4px;
                }

                .typing-dots span {
                    width: 6px;
                    height: 6px;
                    background: var(--vscode-foreground);
                    border-radius: 50%;
                    animation: typing 1.4s infinite;
                }

                .typing-dots span:nth-child(2) {
                    animation-delay: 0.2s;
                }

                .typing-dots span:nth-child(3) {
                    animation-delay: 0.4s;
                }

                @keyframes typing {
                    0%, 60%, 100% { opacity: 0.3; }
                    30% { opacity: 1; }
                }

                .input-container {
                    padding: 16px;
                    border-top: 1px solid var(--vscode-panel-border);
                    display: flex;
                    gap: 8px;
                }

                .input-box {
                    flex: 1;
                    padding: 10px;
                    background: var(--vscode-input-background);
                    color: var(--vscode-input-foreground);
                    border: 1px solid var(--vscode-input-border);
                    border-radius: 6px;
                    font-size: 13px;
                    font-family: inherit;
                    resize: none;
                    outline: none;
                }

                .input-box:focus {
                    border-color: var(--vscode-focusBorder);
                }

                .send-btn {
                    background: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
                    border: none;
                    padding: 10px 20px;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 13px;
                    font-weight: 600;
                }

                .send-btn:hover {
                    background: var(--vscode-button-hoverBackground);
                }

                .send-btn:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }

                .error-message {
                    background: var(--vscode-inputValidation-errorBackground);
                    color: var(--vscode-inputValidation-errorForeground);
                    border: 1px solid var(--vscode-inputValidation-errorBorder);
                    padding: 10px;
                    border-radius: 6px;
                    margin: 8px 16px;
                    font-size: 12px;
                }
                
                .copy-toast {
                    position: fixed;
                    bottom: 20px;
                    right: 20px;
                    background: var(--vscode-notifications-background);
                    color: var(--vscode-notifications-foreground);
                    border: 1px solid var(--vscode-notifications-border);
                    padding: 8px 16px;
                    border-radius: 6px;
                    font-size: 12px;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                    z-index: 1000;
                    animation: slideInUp 0.3s ease;
                }
                
                @keyframes slideInUp {
                    from {
                        transform: translateY(20px);
                        opacity: 0;
                    }
                    to {
                        transform: translateY(0);
                        opacity: 1;
                    }
                }
            </style>
        </head>
        <body>
            <div class="header">
                <h2>🤖 QAgenAI Chat</h2>
                <button class="clear-btn" id="clearBtn">Clear</button>
            </div>

            <div class="chat-container" id="chatContainer">
                <div class="message assistant">
                    Hi! I'm QAgenAI. Ask me about:
                    <ul style="margin-top: 8px; padding-left: 20px;">
                        <li>Generating tests for your code</li>
                        <li>Explaining test strategies</li>
                        <li>Suggesting edge cases</li>
                        <li>Debugging failing tests</li>
                    </ul>
                </div>
            </div>

            <div class="typing-indicator" id="typingIndicator">
                <div class="typing-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
            </div>

            <div class="input-container">
                <textarea 
                    class="input-box" 
                    id="messageInput" 
                    placeholder="Ask about testing..."
                    rows="1"
                ></textarea>
                <button class="send-btn" id="sendBtn">Send</button>
            </div>

            <script>
                const vscode = acquireVsCodeApi();
                const chatContainer = document.getElementById('chatContainer');
                const messageInput = document.getElementById('messageInput');
                const sendBtn = document.getElementById('sendBtn');
                const clearBtn = document.getElementById('clearBtn');
                const typingIndicator = document.getElementById('typingIndicator');
                
                // Add event listeners
                sendBtn.addEventListener('click', sendMessage);
                clearBtn.addEventListener('click', clearHistory);
                messageInput.addEventListener('keydown', handleKeyDown);

                // Handle messages from extension
                window.addEventListener('message', event => {
                    const message = event.data;
                    
                    switch (message.type) {
                        case 'chatResponse':
                            addMessage(message.message, 'assistant');
                            break;
                        case 'typing':
                            if (message.isTyping) {
                                typingIndicator.classList.add('active');
                                scrollToBottom();
                            } else {
                                typingIndicator.classList.remove('active');
                            }
                            break;
                        case 'error':
                            showError(message.error);
                            break;
                        case 'historyCleared':
                            chatContainer.innerHTML = '<div class="message assistant">Chat history cleared!</div>';
                            break;
                    }
                });

                function sendMessage() {
                    console.log('🔵 sendMessage called');
                    const message = messageInput.value.trim();
                    console.log('📝 Message:', message);
                    if (!message) {
                        console.log('⚠️ Empty message, returning');
                        return;
                    }

                    addMessage(message, 'user');
                    console.log('📤 Posting message to extension');
                    vscode.postMessage({
                        type: 'sendMessage',
                        message: message
                    });

                    messageInput.value = '';
                    messageInput.style.height = 'auto';
                    console.log('✅ Message sent');
                }

                function addMessage(text, role) {
                    const messageDiv = document.createElement('div');
                    messageDiv.className = 'message ' + role;
                    
                    // Parse markdown-style code blocks
                    const formattedText = formatMessage(text);
                    messageDiv.innerHTML = formattedText;

                    // Add action buttons for assistant messages
                    if (role === 'assistant') {
                        const actionsDiv = document.createElement('div');
                        actionsDiv.className = 'code-actions';
                        
                        const codeBlocks = extractCodeBlocks(text);
                        if (codeBlocks.length > 0) {
                            // Apply Code button
                            const applyBtn = document.createElement('button');
                            applyBtn.className = 'code-action-btn';
                            applyBtn.textContent = '\u2713 Apply Code';
                            applyBtn.onclick = () => applyCode(codeBlocks[0]);
                            actionsDiv.appendChild(applyBtn);
                            
                            // Copy Code button
                            const copyCodeBtn = document.createElement('button');
                            copyCodeBtn.className = 'code-action-btn';
                            copyCodeBtn.textContent = '\ud83d\udccb Copy Code';
                            copyCodeBtn.onclick = () => copyToClipboard(codeBlocks[0]);
                            actionsDiv.appendChild(copyCodeBtn);
                        }
                        
                        // Always add Copy Message button
                        const copyMsgBtn = document.createElement('button');
                        copyMsgBtn.className = 'code-action-btn';
                        copyMsgBtn.textContent = '\ud83d\udccb Copy';
                        copyMsgBtn.onclick = () => copyToClipboard(text);
                        actionsDiv.appendChild(copyMsgBtn);
                        
                        if (actionsDiv.children.length > 0) {
                            messageDiv.appendChild(actionsDiv);
                        }
                    }

                    chatContainer.appendChild(messageDiv);
                    scrollToBottom();
                }

                function formatMessage(text) {
                    // Convert code blocks (triple backticks)
                    const codeBlockRegex = new RegExp('\\x60\\x60\\x60(\\w*)\\n([\\s\\S]*?)\\x60\\x60\\x60', 'g');
                    text = text.replace(codeBlockRegex, '<pre><code>$2<\/code><\/pre>');
                    // Convert inline code (single backticks)
                    const inlineCodeRegex = new RegExp('\\x60([^\\x60]+)\\x60', 'g');
                    text = text.replace(inlineCodeRegex, '<code>$1<\/code>');
                    // Convert newlines
                    text = text.replace(new RegExp('\\n', 'g'), '<br>');
                    return text;
                }

                function extractCodeBlocks(text) {
                    const regex = new RegExp('\\x60\\x60\\x60(?:\\w*)\\n([\\s\\S]*?)\\x60\\x60\\x60', 'g');
                    const blocks = [];
                    let match;
                    while ((match = regex.exec(text)) !== null) {
                        blocks.push(match[1].trim());
                    }
                    return blocks;
                }

                function applyCode(code) {
                    vscode.postMessage({
                        type: 'applyCode',
                        code: code
                    });
                }
                
                function copyToClipboard(text) {
                    navigator.clipboard.writeText(text).then(() => {
                        // Show temporary success message
                        const toast = document.createElement('div');
                        toast.className = 'copy-toast';
                        toast.textContent = '\u2705 Copied!';
                        document.body.appendChild(toast);
                        setTimeout(() => toast.remove(), 2000);
                    }).catch(err => {
                        console.error('Failed to copy:', err);
                    });
                }

                function clearHistory() {
                    vscode.postMessage({ type: 'clearHistory' });
                }

                function showError(error) {
                    const errorDiv = document.createElement('div');
                    errorDiv.className = 'error-message';
                    errorDiv.textContent = '❌ ' + error;
                    chatContainer.appendChild(errorDiv);
                    scrollToBottom();
                    
                    setTimeout(() => errorDiv.remove(), 5000);
                }

                function handleKeyDown(event) {
                    if (event.key === 'Enter' && !event.shiftKey) {
                        event.preventDefault();
                        sendMessage();
                    }
                }

                function scrollToBottom() {
                    chatContainer.scrollTop = chatContainer.scrollHeight;
                }

                // Auto-resize textarea
                messageInput.addEventListener('input', function() {
                    this.style.height = 'auto';
                    this.style.height = Math.min(this.scrollHeight, 120) + 'px';
                });
            </script>
        </body>
        </html>`;
    }
}

function detectLanguage(extension: string): string {
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

function getTestFileName(fileName: string, extension: string): string {
    const nameWithoutExt = path.basename(fileName, extension);
    
    // Language-specific test file naming
    if (extension === '.py') {
        return `test_${nameWithoutExt}.py`;
    } else if (extension === '.go') {
        return `${nameWithoutExt}_test.go`;
    } else if (extension === '.rb') {
        return `${nameWithoutExt}_spec.rb`;
    } else {
        // JavaScript/TypeScript
        return `${nameWithoutExt}.test${extension}`;
    }
}
