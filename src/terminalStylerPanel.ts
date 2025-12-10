import * as vscode from 'vscode';
import { saveRecentStyle, getRecentStyles } from './utils';

interface TerminalInfo {
    currentName: string;
    defaultName: string;
    terminal: vscode.Terminal;
}

export class TerminalStylerPanel {
    public static currentPanel: TerminalStylerPanel | undefined;
    public static readonly viewType = 'cursorTerminalStyler';

    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;
    private _terminalInfo: TerminalInfo;
    private _disposables: vscode.Disposable[] = [];

    public static createOrShow(extensionUri: vscode.Uri, terminalInfo: TerminalInfo) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        // If we already have a panel, update it and show it
        if (TerminalStylerPanel.currentPanel) {
            TerminalStylerPanel.currentPanel._terminalInfo = terminalInfo;
            TerminalStylerPanel.currentPanel._update();
            TerminalStylerPanel.currentPanel._panel.reveal(column);
            return;
        }

        // Otherwise, create a new panel
        const panel = vscode.window.createWebviewPanel(
            TerminalStylerPanel.viewType,
            'Style Terminal',
            column || vscode.ViewColumn.One,
            {
                enableScripts: true,
                localResourceRoots: [extensionUri],
                retainContextWhenHidden: true
            }
        );

        // Set custom icon using inline SVG data URI
        const svgIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="%23c5c5c5"><path d="M8 1l1.5 3.5L13 6l-3.5 1.5L8 11 6.5 7.5 3 6l3.5-1.5L8 1zm4 7l.75 1.75L14.5 10.5l-1.75.75-.75 1.75-.75-1.75L9.5 10.5l1.75-.75L12 8zM4 10l.5 1.5L6 12l-1.5.5L4 14l-.5-1.5L2 12l1.5-.5L4 10z"/></svg>`;
        const iconUri = vscode.Uri.parse(`data:image/svg+xml,${svgIcon}`);
        panel.iconPath = iconUri;

        TerminalStylerPanel.currentPanel = new TerminalStylerPanel(panel, extensionUri, terminalInfo);
    }

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, terminalInfo: TerminalInfo) {
        this._panel = panel;
        this._extensionUri = extensionUri;
        this._terminalInfo = terminalInfo;

        // Set initial content
        this._update();

        // Handle messages from the webview
        this._panel.webview.onDidReceiveMessage(
            async (message) => {
                switch (message.command) {
                    case 'apply':
                        await this._applyStyle(message.name);
                        this._terminalInfo.currentName = message.name;
                        this._update();
                        break;
                    case 'cancel':
                        this._panel.dispose();
                        break;
                    case 'applyRecent':
                        await this._applyStyle(message.name);
                        this._terminalInfo.currentName = message.name;
                        this._update();
                        break;
                    case 'newTerminal':
                        await this._createNewTerminal();
                        break;
                }
            },
            null,
            this._disposables
        );

        // Listen for active terminal changes
        this._disposables.push(
            vscode.window.onDidChangeActiveTerminal((terminal) => {
                if (terminal) {
                    this._terminalInfo = {
                        currentName: terminal.name,
                        defaultName: terminal.name,
                        terminal: terminal
                    };
                    this._update();
                }
            })
        );

        // Handle panel disposal
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
    }

    private async _applyStyle(name: string) {
        const terminal = this._terminalInfo.terminal;

        try {
            // Make sure the terminal is focused/active
            terminal.show();

            // 1. Rename the terminal
            await vscode.commands.executeCommand('workbench.action.terminal.renameWithArg', {
                name: name
            });

            // 2. Open the icon picker
            await vscode.commands.executeCommand('workbench.action.terminal.changeIcon');

            // 3. Open the color picker
            await vscode.commands.executeCommand('workbench.action.terminal.changeColor');

            // Save to recent styles
            await saveRecentStyle(name);

        } catch (error) {
            vscode.window.showErrorMessage(`Failed to style terminal: ${error}`);
        }
    }

    private async _createNewTerminal() {
        // Create a new terminal
        const terminal = vscode.window.createTerminal();
        terminal.show();

        // Update the panel to target the new terminal
        this._terminalInfo = {
            currentName: terminal.name,
            defaultName: terminal.name,
            terminal: terminal
        };
        this._update();
    }

    private _update() {
        this._panel.webview.html = this._getHtmlForWebview();
    }

    private _getHtmlForWebview(): string {
        const recentStyles = getRecentStyles();

        const recentStylesHtml = recentStyles.length > 0 ? `
            <div class="section recent-section">
                <label>Recent Names</label>
                <div class="recent-list">
                    ${recentStyles.slice(0, 5).map(style => `
                        <button class="recent-btn" data-name="${this._escapeHtml(style.name)}">
                            ${this._escapeHtml(style.name)}
                        </button>
                    `).join('')}
                </div>
            </div>
        ` : '';

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Style Terminal</title>
    <link href="https://unpkg.com/@vscode/codicons@0.0.35/dist/codicon.css" rel="stylesheet" />
    <style>
        * { box-sizing: border-box; }
        body {
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            padding: 12px;
            margin: 0;
            max-width: 400px;
        }
        .header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 10px;
        }
        h2 {
            margin: 0;
            font-size: 13px;
            font-weight: 500;
            display: flex;
            align-items: center;
            gap: 6px;
        }
        .new-terminal-btn {
            display: flex;
            align-items: center;
            gap: 4px;
            padding: 3px 8px;
            background: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
            border: none;
            border-radius: 3px;
            cursor: pointer;
            font-size: 11px;
        }
        .new-terminal-btn:hover {
            background: var(--vscode-button-secondaryHoverBackground);
        }
        label {
            display: block;
            margin-bottom: 4px;
            font-size: 11px;
            font-weight: 500;
            color: var(--vscode-descriptionForeground);
        }
        input[type="text"] {
            width: 100%;
            padding: 5px 8px;
            background: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border: 1px solid var(--vscode-input-border, transparent);
            border-radius: 3px;
            font-size: 12px;
        }
        input[type="text"]:focus {
            outline: none;
            border-color: var(--vscode-focusBorder);
        }
        .recent-section {
            margin-bottom: 10px;
            padding-bottom: 10px;
            border-bottom: 1px solid var(--vscode-panel-border);
        }
        .recent-list {
            display: flex;
            flex-wrap: wrap;
            gap: 4px;
            max-height: 52px;
            overflow: hidden;
        }
        .recent-btn {
            display: flex;
            align-items: center;
            gap: 4px;
            padding: 3px 8px;
            background: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
            border: 1px solid transparent;
            border-radius: 3px;
            cursor: pointer;
            font-size: 11px;
        }
        .recent-btn:hover {
            background: var(--vscode-button-secondaryHoverBackground);
            border-color: var(--vscode-focusBorder);
        }
        .name-section {
            margin-bottom: 10px;
        }
        .bottom-row {
            display: flex;
            align-items: center;
            justify-content: flex-start;
            gap: 6px;
            padding-top: 10px;
            border-top: 1px solid var(--vscode-panel-border);
        }
        button.primary, button.secondary {
            padding: 4px 12px;
            border: none;
            border-radius: 3px;
            cursor: pointer;
            font-size: 12px;
        }
        button.primary {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
        }
        button.primary:hover {
            background: var(--vscode-button-hoverBackground);
        }
        button.secondary {
            background: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
        }
        button.secondary:hover {
            background: var(--vscode-button-secondaryHoverBackground);
        }
    </style>
</head>
<body>
    <div class="header">
        <h2><span class="codicon codicon-terminal"></span> <span id="headerName">${this._escapeHtml(this._terminalInfo.currentName)}</span></h2>
        <button class="new-terminal-btn" id="newTerminalBtn">
            <span class="codicon codicon-add"></span> New Terminal
        </button>
    </div>

    ${recentStylesHtml}

    <div class="name-section">
        <label>Name</label>
        <input type="text" id="terminalName" value="${this._escapeHtml(this._terminalInfo.currentName)}"
               placeholder="${this._escapeHtml(this._terminalInfo.defaultName)}">
    </div>

    <div class="bottom-row">
        <button class="primary" id="applyBtn">Apply</button>
        <button class="secondary" id="cancelBtn">Cancel</button>
    </div>

    <script>
        const vscode = acquireVsCodeApi();

        const nameInput = document.getElementById('terminalName');
        const headerName = document.getElementById('headerName');

        nameInput.addEventListener('input', () => {
            headerName.textContent = nameInput.value || '${this._escapeHtml(this._terminalInfo.defaultName)}';
        });

        document.getElementById('applyBtn').addEventListener('click', () => {
            const name = nameInput.value || '${this._escapeHtml(this._terminalInfo.defaultName)}';
            vscode.postMessage({ command: 'apply', name });
        });

        document.getElementById('cancelBtn').addEventListener('click', () => {
            vscode.postMessage({ command: 'cancel' });
        });

        document.getElementById('newTerminalBtn').addEventListener('click', () => {
            vscode.postMessage({ command: 'newTerminal' });
        });

        document.querySelectorAll('.recent-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                vscode.postMessage({
                    command: 'applyRecent',
                    name: btn.dataset.name
                });
            });
        });

        nameInput.focus();
        nameInput.select();
    </script>
</body>
</html>`;
    }

    private _escapeHtml(text: string): string {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    public dispose() {
        TerminalStylerPanel.currentPanel = undefined;

        this._panel.dispose();

        while (this._disposables.length) {
            const disposable = this._disposables.pop();
            if (disposable) {
                disposable.dispose();
            }
        }
    }
}
