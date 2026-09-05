import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";

/**
 * 運営者への通知メール送信。SES 未設定の環境（ローカル・SES 整備前の本番）
 * では送信をスキップし、呼び出し側の主処理（DB 保存）は成立させる。
 * S3 アーカイブと同じく、通知はあくまで best-effort とする。
 */
let client: SESv2Client | undefined;

function getClient() {
    if (!client) {
        client = new SESv2Client({
            region:
                process.env.SES_REGION ?? process.env.S3_REGION ?? "us-east-1",
            // ローカルの疑似 SES を向ける場合のみ指定
            endpoint: process.env.SES_ENDPOINT,
            credentials:
                process.env.SES_ACCESS_KEY && process.env.SES_SECRET_KEY
                    ? {
                          accessKeyId: process.env.SES_ACCESS_KEY,
                          secretAccessKey: process.env.SES_SECRET_KEY,
                      }
                    : undefined,
        });
    }
    return client;
}

export function isMailConfigured() {
    return !!(process.env.SES_FROM_ADDRESS && process.env.SES_ADMIN_ADDRESS);
}

export interface AdminMail {
    subject: string;
    body: string;
    /** 利用者が入力した返信先。運営が返信するときの宛先に使う */
    replyTo?: string;
}

/**
 * 運営者宛に通知メールを送る。設定が無ければ何もしない（false を返す）。
 * 送信失敗は呼び出し側の失敗にしない（例外を投げない）。
 */
export async function notifyAdmin(mail: AdminMail): Promise<boolean> {
    if (!isMailConfigured()) {
        return false;
    }
    try {
        await getClient().send(
            new SendEmailCommand({
                FromEmailAddress: process.env.SES_FROM_ADDRESS,
                Destination: {
                    ToAddresses: [process.env.SES_ADMIN_ADDRESS!],
                },
                ReplyToAddresses: mail.replyTo ? [mail.replyTo] : undefined,
                Content: {
                    Simple: {
                        Subject: { Data: mail.subject, Charset: "UTF-8" },
                        Body: {
                            Text: { Data: mail.body, Charset: "UTF-8" },
                        },
                    },
                },
            }),
        );
        return true;
    } catch (err) {
        console.warn("failed to send admin notification mail", err);
        return false;
    }
}
