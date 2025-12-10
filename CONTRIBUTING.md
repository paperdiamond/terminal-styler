# Contributing to Terminal Styler

Thanks for your interest in contributing! Here's how to get started.

## Quick Start

1. **Fork** the repo
2. **Clone** your fork locally
3. **Create a branch** for your feature/fix: `git checkout -b my-feature`
4. **Make your changes**
5. **Test** by pressing F5 to launch the Extension Development Host
6. **Commit** with a clear message
7. **Push** to your fork
8. **Open a Pull Request** against `main`

## Development Setup

```bash
# Install dependencies
pnpm install

# Compile
pnpm run compile

# Watch mode (auto-recompile on changes)
pnpm run watch
```

## Testing

1. Press `F5` in VS Code/Cursor to open Extension Development Host
2. Open a terminal in the dev host
3. Click the paintcan icon in the status bar or press `Cmd+Shift+T`
4. Test your changes

## Pull Request Guidelines

- **One feature/fix per PR** - Keep PRs focused
- **Clear description** - Explain what and why
- **Test your changes** - Make sure it works in the Extension Development Host
- **Update CHANGELOG.md** - Add your changes under `[Unreleased]`

## Ideas for Contributions

- New template buttons (e.g., `user`, `hostname`)
- New emoji options
- Themes/styling for the panel
- Bug fixes
- Documentation improvements

## Code Style

- TypeScript for all source code
- Keep it simple - avoid over-engineering
- Match the existing code style

## Questions?

Open an issue or reach out to [@paperdiamond](https://x.com/paperdiamond).

Thanks for helping make Terminal Styler better! 🚀
