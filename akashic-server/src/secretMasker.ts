import process from "node:process";

const SENSITIVE_ENV_NAMES = [
    "STORAGE_ADMIN_TOKEN",
    "SERVER_WEBAPP_API_TOKEN",
    "SERVER_RUNNER_API_TOKEN",
    "RUNNER_SERVER_API_TOKEN",
    "DATABASE_URL",
    "S3_ACCESS_KEY",
    "S3_SECRET_KEY",
    "POSTGRES_PASSWORD",
];

const REDACTED = "************";
// 短すぎる値によって正当なログ断片を壊すのを防ぐ。
const MIN_SECRET_LENGTH = 8;

// AWS アクセスキー ID など、環境変数に載っていなくても形式で判別できるもの。
const GENERIC_PATTERNS: RegExp[] = [/AKIA[0-9A-Z]{16}/g];

let literalSecrets: string[] | undefined;

function collectLiteralSecrets(): string[] {
    const names = new Set(SENSITIVE_ENV_NAMES);
    const extra = process.env.CONTENT_LOG_MASK_ENV;
    if (extra) {
        for (const name of extra.split(",")) {
            const trimmed = name.trim();
            if (trimmed) {
                names.add(trimmed);
            }
        }
    }
    const values: string[] = [];
    for (const name of names) {
        const value = process.env[name];
        if (value && value.length >= MIN_SECRET_LENGTH) {
            values.push(value);
        }
    }
    // 長い値から置換して別の値の部分文字列の取りこぼしを防ぐ。
    return values.sort((a, b) => b.length - a.length);
}

export function maskSecrets(text: string): string {
    if (!text) {
        return text;
    }
    if (literalSecrets == null) {
        literalSecrets = collectLiteralSecrets();
    }
    let out = text;
    for (const secret of literalSecrets) {
        if (out.includes(secret)) {
            out = out.split(secret).join(REDACTED);
        }
    }
    for (const pattern of GENERIC_PATTERNS) {
        out = out.replace(pattern, REDACTED);
    }
    return out;
}
