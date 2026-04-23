import * as fs from "fs";
import * as path from "path";

const CONFIG_DIR = path.join(process.env.HOME || process.env.USERPROFILE || "~", ".gh-xpl");
export const CONFIG_FILE = path.join(CONFIG_DIR, "config.json");

export interface Config {
    apiToken?: string;
}

function getConfig(): Config {
    try {
        if (!fs.existsSync(CONFIG_FILE)) {
            return {};
        }
        const content = fs.readFileSync(CONFIG_FILE, "utf-8");
        return JSON.parse(content);
    } catch {
        return {};
    }
}

export function getApiToken(): string | undefined {
    const config = getConfig();
    return config.apiToken;
}

export function saveApiToken(apiToken: string): void {
    const config = getConfig();
    config.apiToken = apiToken.trim();
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

export function validateApiTokenFormat(apiToken: string): boolean {
    return apiToken.length > 0 && apiToken.trim().length > 0;
}

export const API_TOKEN_URL = "https://github.com/settings/tokens";
