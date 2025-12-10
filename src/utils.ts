import * as vscode from 'vscode';

/**
 * Get the current git branch name using the vscode.git extension
 */
export async function getGitBranch(): Promise<string | undefined> {
    try {
        const gitExtension = vscode.extensions.getExtension('vscode.git');
        if (!gitExtension) {
            return undefined;
        }

        const git = gitExtension.isActive
            ? gitExtension.exports
            : await gitExtension.activate();

        const api = git.getAPI(1);
        if (!api || api.repositories.length === 0) {
            return undefined;
        }

        const repo = api.repositories[0];
        const head = repo.state.HEAD;
        return head?.name;
    } catch {
        return undefined;
    }
}

/**
 * Get the workspace folder name
 */
export function getWorkspaceName(): string {
    const folders = vscode.workspace.workspaceFolders;
    if (folders && folders.length > 0) {
        return folders[0].name;
    }
    return 'Terminal';
}

/**
 * Generate the default terminal name based on the template in settings
 */
export async function getDefaultName(context: vscode.ExtensionContext): Promise<string> {
    const config = vscode.workspace.getConfiguration('cursorTerminalStyler');
    const template = config.get<string>('defaultNameTemplate', '${workspace} (${branch})');

    const workspace = getWorkspaceName();
    const branch = await getGitBranch();

    let result = template;
    result = result.replace(/\$\{workspace\}/g, workspace);

    if (branch) {
        result = result.replace(/\$\{branch\}/g, branch);
    } else {
        // If no branch, clean up the template
        result = result.replace(/\s*\(\$\{branch\}\)/g, '');
        result = result.replace(/\$\{branch\}/g, '');
    }

    return result.trim() || workspace;
}

/**
 * Available terminal colors (VS Code theme colors for terminals)
 */
export const TERMINAL_COLORS = [
    { id: '', name: 'Default (no color)', preview: '#888888' },
    { id: 'terminal.ansiRed', name: 'Red', preview: '#cd3131' },
    { id: 'terminal.ansiGreen', name: 'Green', preview: '#0dbc79' },
    { id: 'terminal.ansiYellow', name: 'Yellow', preview: '#e5e510' },
    { id: 'terminal.ansiBlue', name: 'Blue', preview: '#2472c8' },
    { id: 'terminal.ansiMagenta', name: 'Magenta', preview: '#bc3fbc' },
    { id: 'terminal.ansiCyan', name: 'Cyan', preview: '#11a8cd' },
    { id: 'terminal.ansiWhite', name: 'White', preview: '#e5e5e5' },
];

/**
 * Available terminal icons (codicons)
 */
export const TERMINAL_ICONS = [
    { id: 'terminal', name: 'Terminal' },
    { id: 'terminal-bash', name: 'Bash' },
    { id: 'terminal-cmd', name: 'Command Prompt' },
    { id: 'terminal-powershell', name: 'PowerShell' },
    { id: 'terminal-ubuntu', name: 'Ubuntu' },
    { id: 'terminal-linux', name: 'Linux' },
    { id: 'terminal-tmux', name: 'Tmux' },
    { id: 'code', name: 'Code' },
    { id: 'server', name: 'Server' },
    { id: 'database', name: 'Database' },
    { id: 'debug', name: 'Debug' },
    { id: 'play', name: 'Play' },
    { id: 'rocket', name: 'Rocket' },
    { id: 'zap', name: 'Zap' },
    { id: 'tools', name: 'Tools' },
    { id: 'gear', name: 'Gear' },
    { id: 'beaker', name: 'Beaker' },
    { id: 'bug', name: 'Bug' },
    { id: 'home', name: 'Home' },
    { id: 'folder', name: 'Folder' },
    { id: 'file', name: 'File' },
    { id: 'package', name: 'Package' },
    { id: 'cloud', name: 'Cloud' },
    { id: 'globe', name: 'Globe' },
    { id: 'heart', name: 'Heart' },
    { id: 'star', name: 'Star' },
];

/**
 * Save a style to recent styles
 */
export async function saveRecentStyle(name: string): Promise<void> {
    const config = vscode.workspace.getConfiguration('cursorTerminalStyler');
    const recentStyles = config.get<Array<{name: string}>>('recentStyles', []);

    // Add new style at the beginning, remove duplicates
    const newStyle = { name };
    const filtered = recentStyles.filter(s => s.name !== name);
    filtered.unshift(newStyle);

    // Keep only the last 10
    const trimmed = filtered.slice(0, 10);

    await config.update('recentStyles', trimmed, vscode.ConfigurationTarget.Global);
}

/**
 * Get recent styles
 */
export function getRecentStyles(): Array<{name: string}> {
    const config = vscode.workspace.getConfiguration('cursorTerminalStyler');
    return config.get<Array<{name: string}>>('recentStyles', []);
}

/**
 * Get the parent folder name (one level up from workspace)
 */
export function getParentFolder(): string | undefined {
    const folders = vscode.workspace.workspaceFolders;
    if (folders && folders.length > 0) {
        const parts = folders[0].uri.fsPath.split('/').filter(Boolean);
        if (parts.length >= 2) {
            return parts[parts.length - 2];
        }
    }
    return undefined;
}

/**
 * Get abbreviated path (last 2-3 segments)
 */
export function getAbbreviatedPath(): string | undefined {
    const folders = vscode.workspace.workspaceFolders;
    if (folders && folders.length > 0) {
        const parts = folders[0].uri.fsPath.split('/').filter(Boolean);
        const lastParts = parts.slice(-3);
        return lastParts.join('/');
    }
    return undefined;
}

/**
 * Get git repository name
 */
export async function getRepoName(): Promise<string | undefined> {
    try {
        const gitExtension = vscode.extensions.getExtension('vscode.git');
        if (!gitExtension) {
            return undefined;
        }

        const git = gitExtension.isActive
            ? gitExtension.exports
            : await gitExtension.activate();

        const api = git.getAPI(1);
        if (!api || api.repositories.length === 0) {
            return undefined;
        }

        const repo = api.repositories[0];
        const repoPath = repo.rootUri.fsPath;
        const parts = repoPath.split('/').filter(Boolean);
        return parts[parts.length - 1];
    } catch {
        return undefined;
    }
}

/**
 * Get template values for insertion
 */
export async function getTemplateValues(): Promise<{
    folder: string | undefined;
    path: string | undefined;
    repo: string | undefined;
    branch: string | undefined;
    date: string;
    time: string;
}> {
    const now = new Date();
    return {
        folder: getParentFolder(),
        path: getAbbreviatedPath(),
        repo: await getRepoName(),
        branch: await getGitBranch(),
        date: now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        time: now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase()
    };
}
