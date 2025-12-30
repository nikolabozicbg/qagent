import * as vscode from 'vscode';

export function getWebviewHtml(webview: vscode.Webview): string {
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
                background: var(--vscode-sideBar-background);
                color: var(--vscode-foreground);
                height: 100vh;
                display: flex;
                flex-direction: column;
            }

            .header {
                padding: 16px;
                border-bottom: 1px solid var(--vscode-panel-border);
                display: flex;
                justify-content: space-between;
                align-items: center;
                background: linear-gradient(180deg, 
                    var(--vscode-sideBar-background) 0%, 
                    transparent 100%);
                backdrop-filter: blur(10px);
            }

            .header h2 {
                font-size: 14px;
                font-weight: 600;
                color: var(--vscode-foreground);
                display: flex;
                align-items: center;
                gap: 8px;
            }

            .clear-btn {
                background: rgba(255, 255, 255, 0.05);
                border: 1px solid rgba(255, 255, 255, 0.1);
                color: var(--vscode-button-foreground);
                padding: 6px 12px;
                border-radius: 8px;
                cursor: pointer;
                font-size: 12px;
                font-weight: 500;
                transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
            }

            .clear-btn:hover {
                background: rgba(255, 255, 255, 0.1);
                border-color: rgba(255, 255, 255, 0.2);
                transform: translateY(-1px);
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
            }

            .chat-container {
                flex: 1;
                overflow-y: auto;
                padding: 16px;
                display: flex;
                flex-direction: column;
                gap: 12px;
            }

            .message-wrapper {
                display: flex;
                gap: 10px;
                align-items: flex-start;
                max-width: 90%;
                animation: messageSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
            }
            
            .message-wrapper.user {
                align-self: flex-end;
                flex-direction: row-reverse;
            }
            
            .message-wrapper.assistant {
                align-self: flex-start;
            }
            
            @keyframes messageSlideIn {
                from {
                    opacity: 0;
                    transform: translateY(8px) scale(0.98);
                }
                to {
                    opacity: 1;
                    transform: translateY(0) scale(1);
                }
            }
            
            .avatar {
                width: 32px;
                height: 32px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 16px;
                flex-shrink: 0;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
                transition: transform 0.2s ease;
            }
            
            .avatar.user {
                background: linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%);
            }
            
            .avatar.assistant {
                background: linear-gradient(135deg, #06B6D4 0%, #0891B2 100%);
            }
            
            .message-wrapper:hover .avatar {
                transform: scale(1.05);
            }
            
            .message-content {
                display: flex;
                flex-direction: column;
                gap: 4px;
                flex: 1;
            }
            
            .message-header {
                display: flex;
                align-items: center;
                gap: 8px;
                font-size: 11px;
                color: var(--vscode-descriptionForeground);
                font-weight: 500;
            }
            
            .message-time {
                opacity: 0.7;
            }

            .message {
                padding: 12px 16px;
                border-radius: 12px;
                word-wrap: break-word;
                line-height: 1.6;
                font-size: 13px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.08);
                transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
                position: relative;
            }
            
            .message::before {
                content: '';
                position: absolute;
                width: 0;
                height: 0;
                border: 6px solid transparent;
            }
            
            .message-wrapper.user .message {
                background: linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%);
                color: white;
                border: none;
            }
            
            .message-wrapper.user .message::before {
                right: -6px;
                top: 10px;
                border-left-color: #7C3AED;
            }

            .message-wrapper.assistant .message {
                background: var(--vscode-editor-background);
                color: var(--vscode-foreground);
                border: 1px solid var(--vscode-widget-border);
            }
            
            .message-wrapper.assistant .message::before {
                left: -6px;
                top: 10px;
                border-right-color: var(--vscode-widget-border);
            }
            
            .message-wrapper:hover .message {
                box-shadow: 0 4px 16px rgba(0,0,0,0.12);
                transform: translateY(-1px);
            }

            .message pre {
                background: var(--vscode-textCodeBlock-background);
                padding: 12px;
                border-radius: 8px;
                overflow-x: auto;
                margin: 12px 0;
                font-size: 12px;
                border: 1px solid var(--vscode-panel-border);
                position: relative;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            
            .message pre::before {
                content: '●●●';
                position: absolute;
                top: 8px;
                left: 12px;
                font-size: 8px;
                color: var(--vscode-descriptionForeground);
                letter-spacing: 2px;
            }

            .message code {
                background: var(--vscode-textCodeBlock-background);
                padding: 3px 6px;
                border-radius: 4px;
                font-family: 'SF Mono', 'Monaco', 'Cascadia Code', 'Courier New', monospace;
                font-size: 12px;
                border: 1px solid var(--vscode-panel-border);
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
            
            .code-action-primary {
                background: var(--vscode-button-background) !important;
                color: var(--vscode-button-foreground) !important;
            }
            
            .code-action-primary:hover {
                background: var(--vscode-button-hoverBackground) !important;
            }
            
            @keyframes slideIn {
                from {
                    opacity: 0;
                    transform: translateY(10px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
            
            @keyframes pulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.6; }
            }
            
            .action-preview {
                background: linear-gradient(135deg, 
                    rgba(0, 122, 255, 0.05) 0%, 
                    rgba(88, 86, 214, 0.05) 100%);
                backdrop-filter: blur(10px);
                border: 2px solid var(--vscode-focusBorder);
                border-radius: 12px;
                padding: 18px;
                margin: 16px 0;
                font-size: 13px;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
                animation: slideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1);
                position: relative;
                overflow: visible;
                transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
            }
            
            .action-preview:hover {
                transform: translateY(-2px);
                box-shadow: 0 12px 48px rgba(0, 0, 0, 0.15);
            }
            
            .action-preview.action-pending {
                border-color: rgba(139, 92, 246, 0.5);
                background: linear-gradient(135deg, 
                    rgba(139, 92, 246, 0.05) 0%, 
                    rgba(168, 85, 247, 0.05) 100%);
            }
            
            .action-preview.action-executing {
                border-color: rgba(59, 130, 246, 0.8);
                background: linear-gradient(135deg, 
                    rgba(59, 130, 246, 0.08) 0%, 
                    rgba(96, 165, 250, 0.08) 100%);
                animation: shimmer 2s ease-in-out infinite;
            }
            
            .action-preview.action-success {
                border-color: rgba(34, 197, 94, 0.8);
                background: linear-gradient(135deg, 
                    rgba(34, 197, 94, 0.08) 0%, 
                    rgba(74, 222, 128, 0.08) 100%);
            }
            
            .action-preview.action-skipped {
                border-color: rgba(156, 163, 175, 0.5);
                background: rgba(156, 163, 175, 0.05);
                opacity: 0.6;
            }
            
            @keyframes shimmer {
                0%, 100% {
                    border-color: rgba(59, 130, 246, 0.5);
                }
                50% {
                    border-color: rgba(59, 130, 246, 1);
                    box-shadow: 0 0 20px rgba(59, 130, 246, 0.3);
                }
            }
            
            .action-preview::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                height: 2px;
                background: linear-gradient(90deg, 
                    var(--vscode-focusBorder) 0%, 
                    transparent 100%);
            }
            
            .btn-accept {
                background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                color: white;
                border: none;
                padding: 8px 16px;
                border-radius: 8px;
                cursor: pointer;
                font-size: 13px;
                font-weight: 600;
                transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
                box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);
                position: relative;
                overflow: hidden;
            }
            
            .btn-accept:hover {
                transform: translateY(-2px);
                box-shadow: 0 4px 16px rgba(16, 185, 129, 0.4);
            }
            
            .btn-accept:disabled {
                opacity: 0.5;
                cursor: not-allowed;
                transform: none;
            }
            
            .btn-reject {
                background: rgba(107, 114, 128, 0.1);
                color: var(--vscode-foreground);
                border: 1px solid rgba(107, 114, 128, 0.3);
                padding: 8px 16px;
                border-radius: 8px;
                cursor: pointer;
                font-size: 13px;
                font-weight: 600;
                transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
            }
            
            .btn-reject:hover {
                background: rgba(107, 114, 128, 0.2);
                border-color: rgba(107, 114, 128, 0.5);
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
            }

            .btn-preview {
                background: rgba(59, 130, 246, 0.1);
                color: var(--vscode-foreground);
                border: 1px solid rgba(59, 130, 246, 0.3);
                padding: 8px 16px;
                border-radius: 8px;
                cursor: pointer;
                font-size: 13px;
                font-weight: 600;
                transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
                margin-right: auto; /* Push others to right */
            }
            
            .btn-preview:hover {
                background: rgba(59, 130, 246, 0.2);
                border-color: rgba(59, 130, 246, 0.5);
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(59, 130, 246, 0.1);
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
                gap: 10px;
                background: var(--vscode-sideBar-background);
                backdrop-filter: blur(10px);
            }

            .input-box {
                flex: 1;
                padding: 12px 16px;
                background: var(--vscode-input-background);
                color: var(--vscode-input-foreground);
                border: 2px solid var(--vscode-input-border);
                border-radius: 12px;
                font-size: 13px;
                font-family: inherit;
                resize: none;
                outline: none;
                transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
            }

            .input-box:focus {
                border-color: var(--vscode-focusBorder);
                box-shadow: 0 4px 16px rgba(0, 122, 255, 0.15);
                transform: translateY(-1px);
            }
            
            .input-box::placeholder {
                color: var(--vscode-input-placeholderForeground);
                opacity: 0.6;
            }

            .send-btn {
                background: linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%);
                color: white;
                border: none;
                padding: 12px 24px;
                border-radius: 12px;
                cursor: pointer;
                font-size: 13px;
                font-weight: 600;
                transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
                box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
                display: flex;
                align-items: center;
                gap: 6px;
            }

            .send-btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 20px rgba(139, 92, 246, 0.4);
            }
            
            .send-btn:active {
                transform: translateY(0);
            }

            .send-btn:disabled {
                opacity: 0.5;
                cursor: not-allowed;
                transform: none;
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
            
            /* Welcome Card Styles */
            .welcome-card {
                background: linear-gradient(135deg, 
                    rgba(139, 92, 246, 0.05) 0%, 
                    rgba(6, 182, 212, 0.05) 100%);
                border: 1px solid rgba(139, 92, 246, 0.2);
                border-radius: 16px;
                padding: 24px;
                margin: 16px 0;
                animation: fadeInScale 0.6s cubic-bezier(0.16, 1, 0.3, 1);
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
            }
            
            @keyframes fadeInScale {
                from {
                    opacity: 0;
                    transform: scale(0.95) translateY(10px);
                }
                to {
                    opacity: 1;
                    transform: scale(1) translateY(0);
                }
            }
            
            .welcome-header {
                display: flex;
                align-items: center;
                gap: 16px;
                margin-bottom: 24px;
            }
            
            .welcome-icon {
                width: 48px;
                height: 48px;
                border-radius: 12px;
                background: linear-gradient(135deg, #8B5CF6 0%, #06B6D4 100%);
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 24px;
                box-shadow: 0 4px 16px rgba(139, 92, 246, 0.4);
                animation: iconPulse 2s ease-in-out infinite;
            }
            
            @keyframes iconPulse {
                0%, 100% {
                    transform: scale(1);
                    box-shadow: 0 4px 16px rgba(139, 92, 246, 0.4);
                }
                50% {
                    transform: scale(1.05);
                    box-shadow: 0 6px 24px rgba(139, 92, 246, 0.6);
                }
            }
            
            .welcome-title {
                font-size: 18px;
                font-weight: 700;
                color: var(--vscode-foreground);
                margin: 0;
                letter-spacing: -0.02em;
                line-height: 1.2;
            }
            
            .welcome-subtitle {
                font-size: 13px;
                color: var(--vscode-descriptionForeground);
                margin: 4px 0 0 0;
                font-weight: 400;
            }
            
            .capabilities-grid {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 12px;
                margin-bottom: 20px;
            }
            
            .capability-item {
                display: flex;
                align-items: center;
                gap: 10px;
                padding: 12px;
                background: var(--vscode-editor-background);
                border: 1px solid var(--vscode-widget-border);
                border-radius: 10px;
                transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
                cursor: default;
            }
            
            .capability-item:hover {
                background: rgba(139, 92, 246, 0.08);
                border-color: rgba(139, 92, 246, 0.3);
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
            }
            
            .capability-icon {
                font-size: 20px;
                flex-shrink: 0;
            }
            
            .capability-text {
                font-size: 13px;
                font-weight: 500;
                color: var(--vscode-foreground);
                line-height: 1.4;
            }
            
            .quick-actions {
                border-top: 1px solid var(--vscode-widget-border);
                padding-top: 16px;
                display: flex;
                flex-direction: column;
                gap: 10px;
            }
            
            .quick-actions-label {
                font-size: 11px;
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 0.05em;
                color: var(--vscode-descriptionForeground);
                margin: 0 0 4px 0;
            }
            
            .quick-action-btn {
                background: rgba(139, 92, 246, 0.1);
                border: 1px solid rgba(139, 92, 246, 0.3);
                color: var(--vscode-foreground);
                padding: 10px 16px;
                border-radius: 8px;
                font-size: 13px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
                display: flex;
                align-items: center;
                gap: 8px;
                width: 100%;
                justify-content: flex-start;
            }
            
            .quick-action-btn span {
                font-size: 16px;
            }
            
            .quick-action-btn:hover {
                background: rgba(139, 92, 246, 0.2);
                border-color: rgba(139, 92, 246, 0.5);
                transform: translateX(4px);
                box-shadow: 0 2px 8px rgba(139, 92, 246, 0.2);
            }
            
            .quick-action-btn:active {
                transform: translateX(2px);
            }
        </style>
    </head>
    <body>
        <div class="header">
            <h2>🤖 QAgenAI Chat</h2>
            <button class="clear-btn" id="clearBtn">Clear</button>
        </div>

        <div class="chat-container" id="chatContainer">
            <div class="welcome-card">
                <div class="welcome-header">
                    <div class="welcome-icon">✨</div>
                    <div>
                        <h3 class="welcome-title">Welcome to QAgenAI</h3>
                        <p class="welcome-subtitle">Your AI-powered testing assistant</p>
                    </div>
                </div>
                
                <div class="capabilities-grid">
                    <div class="capability-item">
                        <span class="capability-icon">🧪</span>
                        <span class="capability-text">Generate comprehensive tests</span>
                    </div>
                    <div class="capability-item">
                        <span class="capability-icon">📚</span>
                        <span class="capability-text">Explain testing strategies</span>
                    </div>
                    <div class="capability-item">
                        <span class="capability-icon">🎯</span>
                        <span class="capability-text">Suggest edge cases</span>
                    </div>
                    <div class="capability-item">
                        <span class="capability-icon">🔍</span>
                        <span class="capability-text">Debug failing tests</span>
                    </div>
                </div>
                
                <div class="quick-actions">
                    <p class="quick-actions-label">Quick start:</p>
                    <button class="quick-action-btn" onclick="document.getElementById('messageInput').value='Generate tests for the selected file'; document.getElementById('messageInput').focus();">
                        <span>⚡</span> Generate tests
                    </button>
                    <button class="quick-action-btn" onclick="document.getElementById('messageInput').value='Explain the testing strategy for this project'; document.getElementById('messageInput').focus();">
                        <span>💡</span> Testing strategy
                    </button>
                </div>
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
            <button class="send-btn" id="sendBtn">
                <span>Send</span>
                <span>↑</span>
            </button>
        </div>

        <script>
            const vscode = acquireVsCodeApi();
            const chatContainer = document.getElementById('chatContainer');
            const messageInput = document.getElementById('messageInput');
            const sendBtn = document.getElementById('sendBtn');
            const clearBtn = document.getElementById('clearBtn');
            const typingIndicator = document.getElementById('typingIndicator');
            
            sendBtn.addEventListener('click', sendMessage);
            clearBtn.addEventListener('click', clearHistory);
            messageInput.addEventListener('keydown', handleKeyDown);

            window.addEventListener('message', event => {
                const message = event.data;
                
                switch (message.type) {
                    case 'chatResponse':
                        addMessage(message.message, 'assistant', message.actions);
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
                const message = messageInput.value.trim();
                if (!message) return;

                addMessage(message, 'user');
                vscode.postMessage({
                    type: 'sendMessage',
                    message: message
                });

                messageInput.value = '';
                messageInput.style.height = 'auto';
            }

            function addMessage(text, role, agentActions = null) {
                const wrapper = document.createElement('div');
                wrapper.className = 'message-wrapper ' + role;
                
                const avatar = document.createElement('div');
                avatar.className = 'avatar ' + role;
                avatar.textContent = role === 'user' ? '👤' : '🤖';
                
                const content = document.createElement('div');
                content.className = 'message-content';
                
                const header = document.createElement('div');
                header.className = 'message-header';
                const name = document.createElement('span');
                name.textContent = role === 'user' ? 'You' : 'QAgenAI';
                const time = document.createElement('span');
                time.className = 'message-time';
                time.textContent = getTimestamp();
                header.appendChild(name);
                header.appendChild(time);
                
                const messageDiv = document.createElement('div');
                messageDiv.className = 'message';
                const formattedText = formatMessage(text);
                messageDiv.innerHTML = formattedText;
                
                content.appendChild(header);
                content.appendChild(messageDiv);
                wrapper.appendChild(avatar);
                wrapper.appendChild(content);

                if (role === 'assistant' && agentActions && agentActions.length > 0) {
                    chatContainer.appendChild(wrapper);
                    scrollToBottom();
                    streamActionsOneByOne(agentActions);
                    return;
                }

                chatContainer.appendChild(wrapper);
                scrollToBottom();
            }
            
            function getTimestamp() {
                const now = new Date();
                const hours = now.getHours().toString().padStart(2, '0');
                const minutes = now.getMinutes().toString().padStart(2, '0');
                return hours + ':' + minutes;
            }

            function streamActionsOneByOne(actions) {
                let currentIndex = 0;
                const totalActions = actions.filter(a => a.tool !== 'task_complete').length;
                
                function showNextAction() {
                    while (currentIndex < actions.length && actions[currentIndex].tool === 'task_complete') {
                        currentIndex++;
                    }
                    
                    if (currentIndex >= actions.length) return;
                    
                    const action = actions[currentIndex];
                    const actionCard = createActionCard(action, currentIndex, totalActions);
                    
                    chatContainer.appendChild(actionCard);
                    scrollToBottom();
                    
                    const acceptBtn = actionCard.querySelector('.btn-accept');
                    const skipBtn = actionCard.querySelector('.btn-reject');
                    const previewBtn = actionCard.querySelector('.btn-preview');

                    if (previewBtn) {
                        previewBtn.onclick = () => {
                            vscode.postMessage({
                                type: 'previewDiff',
                                action: action
                            });
                        };
                    }
                    
                    acceptBtn.onclick = () => {
                        actionCard.className = 'action-preview action-executing';
                        acceptBtn.disabled = true;
                        skipBtn.disabled = true;
                        acceptBtn.textContent = '⏳ Executing...';
                        
                        vscode.postMessage({
                            type: 'executeAgentActions',
                            actions: [action]
                        });
                        
                        setTimeout(() => {
                            actionCard.className = 'action-preview action-success';
                            acceptBtn.textContent = '✅ Completed';
                            
                            setTimeout(() => {
                                currentIndex++;
                                showNextAction();
                            }, 600);
                        }, 800);
                    };
                    
                    skipBtn.onclick = () => {
                        actionCard.className = 'action-preview action-skipped';
                        acceptBtn.disabled = true;
                        skipBtn.disabled = true;
                        skipBtn.textContent = '✓ Skipped';
                        
                        setTimeout(() => {
                            currentIndex++;
                            showNextAction();
                        }, 400);
                    };
                }
                
                showNextAction();
            }

            function createActionCard(action, index, total) {
                const card = document.createElement('div');
                card.className = 'action-preview action-pending';
                
                const title = getActionTitle(action);
                const icon = getActionIcon(action.tool);
                
                const showPreview = action.tool === 'create_file' || action.tool === 'edit_file';
                const previewBtn = showPreview ? '<button class="btn-preview">👁️ Diff</button>' : '';

                card.innerHTML = \`
                    <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
                        <div style="font-weight: 600;">\${icon} \${title}</div>
                        <div style="font-size: 11px; color: var(--vscode-descriptionForeground);">\${index + 1}/\${total}</div>
                    </div>
                    <div style="display: flex; gap: 8px; justify-content: flex-end;">
                        \${previewBtn}
                        <button class="btn-accept">✓ Execute</button>
                        <button class="btn-reject">→ Skip</button>
                    </div>
                \`;
                
                return card;
            }

            function getActionIcon(tool) {
                const icons = {
                    'execute_command': '⚡',
                    'create_file': '📄',
                    'edit_file': '✏️',
                    'read_file': '👁️',
                    'list_directory': '📁',
                    'ask_user': '❓',
                    'task_complete': '✅'
                };
                return icons[tool] || '🔧';
            }

            function getActionTitle(action) {
                const args = action.arguments;
                switch (action.tool) {
                    case 'execute_command':
                        return 'Run: ' + args.command;
                    case 'create_file':
                        return 'Create: ' + args.path;
                    case 'edit_file':
                        return 'Edit: ' + args.path;
                    default:
                        return action.tool.replace('_', ' ');
                }
            }

            function formatMessage(text) {
                text = text.replace(/\`\`\`(\\w*)\\n([\\s\\S]*?)\`\`\`/g, '<pre><code>$2</code></pre>');
                text = text.replace(/\`([^\`]+)\`/g, '<code>$1</code>');
                text = text.replace(/\\n/g, '<br>');
                return text;
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

            messageInput.addEventListener('input', function() {
                this.style.height = 'auto';
                this.style.height = Math.min(this.scrollHeight, 120) + 'px';
            });
        </script>
    </body>
    </html>`;
}
