# GitHub Repository Explorer CLI

A powerful CLI and TUI for exploring GitHub repositories using the official GitHub API. Supports searching for repositories, displaying repository READMEs, getting file or directory contents, and multiple output formats. Includes an interactive TUI and a skill for AI agents.

## Features

- Search GitHub repositories
- Display repository README
- Get file or directory contents
- Interactive TUI
- GitHub API token authentication for higher rate limits
- JSON and Markdown output formats
- AI agent skill for autonomous exploration

## Installation

```bash
npm install -g gh-xpl
```

## Setup

Before using the CLI, you can set up your GitHub API token for higher rate limits (5,000 requests per hour instead of 60):

```bash
gh-xpl auth
```

## Usage

### Search Repositories

```bash
gh-xpl search "typescript tutorial"
gh-xpl search "react hooks" --count 10
```

### Get Repository Info

Display a repository's README:

```bash
gh-xpl info facebook/react
# or
gh-xpl info https://github.com/facebook/react
```

### Get File/Directory Contents

Get contents of a file or list a directory:

```bash
# Get root directory
gh-xpl get facebook/react

# Get specific file
gh-xpl get facebook/react README.md

# List src directory
gh-xpl get facebook/react src

# Get file content
gh-xpl get facebook/react src/index.ts
```

### Interactive TUI

Launch an interactive terminal user interface for exploring repositories:

```bash
gh-xpl tui
# or with an initial query
gh-xpl tui "react"
```

### JSON output

```bash
# Output as JSON for scripting
gh-xpl search "react" --json
gh-xpl info facebook/react --json
gh-xpl get facebook/react package.json --json
```

### Options

| Command  | Description                    | Options                 |
| -------- | ------------------------------ | ----------------------- |
| `search` | Search GitHub repositories     | `--count <n>`, `--json` |
| `info`   | Display repository README      | `--json`                |
| `get`    | Get file or directory contents | `--json`                |
| `tui`    | Interactive TUI                |                         |
| `auth`   | Set up GitHub API token        |                         |
| `skill`  | Install skill for AI agents    | `--global`              |

### AI Agent Skill

Install the skill for AI agents to use the gh-xpl command autonomously:

```bash
# Install in current project
gh-xpl skill

# Install globally
gh-xpl skill --global
```

The skill enables AI agents to explore GitHub repositories using the gh-xpl command.

## Support

For bug reports and feature requests, please fill an issue at [GitHub repository](https://github.com/rom100main/gh-xpl/issues).

## Changelog

See [CHANGELOG](CHANGELOG.md) for a list of changes in each version.

## Development

For development information, see [CONTRIBUTING](CONTRIBUTING.md).

## License

MIT
