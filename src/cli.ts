import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";

import { Command } from "commander";

import packageJson from "../package.json" with { type: "json" };
const { version } = packageJson;

import { DEFAULT_SEARCH_COUNT, SKILL_NAME } from "./config.js";
import { getFileContents, getReadme, searchRepositories } from "./github/api.js";
import { formatFileListMarkdown, formatReadmeMarkdown, formatSearchResultsMarkdown } from "./output/format.js";
import { runTui } from "./tui/index.js";
import type { CliOptions } from "./types.js";
import { API_TOKEN_URL, CONFIG_FILE, saveApiToken, validateApiTokenFormat } from "./utils/auth.js";
import { parseRepoInput } from "./utils/parser.js";

export function createCli(): Command {
    const program = new Command();

    program.name("gh-xpl").description("GitHub Repository Explorer CLI").version(version);

    program.command("auth").description("Set up your GitHub API token").action(handleAuth);

    program
        .command("search")
        .description("Search GitHub repositories")
        .argument("<query>", "Search query")
        .option("--count <n>", "Number of results to return")
        .option("--json", "Output as JSON")
        .action(handleSearch);

    program
        .command("info")
        .description("Display repository README")
        .argument("<repo>", "Repository URL or owner/repo")
        .option("--json", "Output as JSON")
        .action(handleInfo);

    program
        .command("get")
        .description("Get file or directory contents")
        .argument("<repo>", "Repository URL or owner/repo")
        .argument("[path]", "File or directory path", ".")
        .option("--json", "Output as JSON")
        .action(handleGet);

    program
        .command("skill")
        .description("Install the gh-xpl skill for AI agents")
        .option("--global", "Install globally in ~/.agents/skills/")
        .action(installSkill);

    program
        .command("tui")
        .description("Interactive TUI for exploring GitHub repositories")
        .argument("[query]", "Initial search query")
        .action(async (query?: string) => {
            await runTui(query);
        });

    return program;
}

const SKILL_CONTENT = `---
name: ${SKILL_NAME}
description: Explore GitHub repositories. Use when the user asks to view code from GitHub, explore repositories, get file contents, or search for repositories.
---

If not installed: \`npm install -g gh-xpl\`

# Usage

## Search Repositories
Search for repositories on GitHub:
\`\`\`bash
gh-xpl search "<query>"
\`\`\`

Optional flags:
- \`--count <n>\` - Number of results (default: 10)
- \`--json\` - Output as JSON

## Get Repository Info
Display a repository's README:
\`\`\`bash
gh-xpl info <owner/repo>
# or
gh-xpl info https://github.com/owner/repo
\`\`\`

## Get File/Directory Contents
Get contents of a file or list a directory:
\`\`\`bash
gh-xpl get <owner/repo> [path]
# or
gh-xpl get https://github.com/owner/repo [path]
\`\`\`

Examples:
\`\`\`bash
# Get README (default path is root)
gh-xpl get facebook/react

# Get specific file
gh-xpl get facebook/react README.md

# List src directory
gh-xpl get facebook/react src

# Get file content
gh-xpl get facebook/react src/index.ts
\`\`\`

## Authentication
Set up GitHub API token for higher rate limits:
\`\`\`bash
gh-xpl auth
\`\`\`

Note: Without authentication, you are limited to 60 requests per hour. With a token, you get 5,000 requests per hour.
`;

async function installSkill(options: CliOptions): Promise<void> {
    const homeDir = process.env.HOME || process.env.USERPROFILE || "~";
    const skillDir = options.global
        ? path.join(homeDir, ".agents", "skills", SKILL_NAME)
        : path.join(process.cwd(), ".agents", "skills", SKILL_NAME);
    const skillFile = path.join(skillDir, "SKILL.md");

    try {
        fs.mkdirSync(skillDir, { recursive: true });
        fs.writeFileSync(skillFile, SKILL_CONTENT);
        console.log(`Skill installed at ${skillFile}`);
    } catch (error) {
        console.error("Error installing skill:", error);
        process.exit(1);
    }
}

async function handleAuth(): Promise<void> {
    console.log("GitHub API Token Setup\n");
    console.log("To get your API token:");
    console.log(`1. Visit: ${API_TOKEN_URL}`);
    console.log("2. Click 'Generate new token (classic)'");
    console.log("3. Give it a name and select 'repo' scope for full access");
    console.log("4. Generate and copy the token\n");

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    rl.question("Enter your GitHub API token: ", (apiToken) => {
        rl.close();

        if (!validateApiTokenFormat(apiToken)) {
            console.error("Error: Invalid API token format");
            process.exit(1);
        }

        saveApiToken(apiToken);
        console.log("\nAPI token saved successfully!");
        console.log(`Saved to: ${CONFIG_FILE}`);
        console.log("You can now use gh-xpl commands with higher rate limits.");
    });
}

async function handleSearch(query: string, options: CliOptions): Promise<void> {
    let count = DEFAULT_SEARCH_COUNT;

    if (options.count) {
        const parsed = parseInt(options.count, 10);
        if (!isNaN(parsed) && parsed > 0) {
            count = parsed;
        } else {
            console.error(`Invalid count value, using default (${DEFAULT_SEARCH_COUNT})`);
        }
    }

    try {
        const results = await searchRepositories(query, count);

        if (options.json) {
            console.log(JSON.stringify(results, null, 2));
        } else {
            console.log(formatSearchResultsMarkdown(results));
        }
    } catch (error) {
        console.error("Error searching repositories:", error instanceof Error ? error.message : error);
        process.exit(1);
    }
}

async function handleInfo(repoInput: string, options: CliOptions): Promise<void> {
    const identifier = parseRepoInput(repoInput);
    if (!identifier) {
        console.error("Error: Invalid repository format. Use 'owner/repo' or a GitHub URL.");
        process.exit(1);
    }

    try {
        const readme = await getReadme(identifier);

        if (!readme) {
            console.error("Error: Could not fetch README for this repository.");
            process.exit(1);
        }

        if (options.json) {
            console.log(JSON.stringify({ readme }, null, 2));
        } else {
            console.log(formatReadmeMarkdown(readme, `${identifier.owner}/${identifier.repo}`));
        }
    } catch (error) {
        console.error("Error fetching README:", error instanceof Error ? error.message : error);
        process.exit(1);
    }
}

async function handleGet(repoInput: string, filePath: string, options: CliOptions): Promise<void> {
    const identifier = parseRepoInput(repoInput);
    if (!identifier) {
        console.error("Error: Invalid repository format. Use 'owner/repo' or a GitHub URL.");
        process.exit(1);
    }

    try {
        const contents = await getFileContents(identifier, filePath);

        if (!contents) {
            console.error("Error: Could not fetch contents. File or directory not found.");
            process.exit(1);
        }

        // Handle directory listing
        if (Array.isArray(contents)) {
            if (options.json) {
                console.log(JSON.stringify(contents, null, 2));
            } else {
                console.log(formatFileListMarkdown(contents, filePath));
            }
            return;
        }

        // Handle single file
        if (options.json) {
            console.log(JSON.stringify(contents, null, 2));
        } else {
            if (contents.content) {
                console.log(contents.content);
            } else {
                console.error("Error: Binary file, cannot display content.");
                process.exit(1);
            }
        }
    } catch (error) {
        console.error("Error fetching contents:", error instanceof Error ? error.message : error);
        process.exit(1);
    }
}
