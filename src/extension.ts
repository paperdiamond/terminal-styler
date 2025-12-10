import * as vscode from 'vscode';
import { TerminalStylerPanel } from './terminalStylerPanel';
import { getDefaultName } from './utils';

let statusBarItem: vscode.StatusBarItem;

export function activate(context: vscode.ExtensionContext) {
    // Create status bar item (right side)
    statusBarItem = vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Right,
        100
    );
    statusBarItem.command = 'cursorTerminalStyler.styleActive';
    statusBarItem.text = '$(paintcan) Style';
    statusBarItem.tooltip = 'Style active terminal (name, icon, color)';
    context.subscriptions.push(statusBarItem);

    // Register the main command
    const styleCommand = vscode.commands.registerCommand(
        'cursorTerminalStyler.styleActive',
        async () => {
            const terminal = vscode.window.activeTerminal;
            if (!terminal) {
                vscode.window.showWarningMessage('No active terminal to style.');
                return;
            }

            // Get default values
            const defaultName = await getDefaultName(context);
            const currentName = terminal.name;

            // Open the styler panel
            TerminalStylerPanel.createOrShow(context.extensionUri, {
                currentName,
                defaultName,
                terminal
            });
        }
    );
    context.subscriptions.push(styleCommand);

    // Update status bar visibility based on active terminal
    updateStatusBarVisibility();

    // Listen for terminal changes
    context.subscriptions.push(
        vscode.window.onDidChangeActiveTerminal(() => {
            updateStatusBarVisibility();
        })
    );

    context.subscriptions.push(
        vscode.window.onDidOpenTerminal(() => {
            updateStatusBarVisibility();
        })
    );

    context.subscriptions.push(
        vscode.window.onDidCloseTerminal(() => {
            updateStatusBarVisibility();
        })
    );
}

function updateStatusBarVisibility() {
    if (vscode.window.activeTerminal) {
        statusBarItem.show();
    } else {
        statusBarItem.hide();
    }
}

export function deactivate() {
    if (statusBarItem) {
        statusBarItem.dispose();
    }
}
