import * as process from "node:process";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

let s3Client: S3Client | undefined;

function getS3Client(): S3Client {
    if (!s3Client) {
        s3Client = new S3Client({
            region: process.env.S3_REGION ?? "us-east-1",
            endpoint: process.env.S3_ENDPOINT,
            forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
            credentials:
                process.env.S3_ACCESS_KEY && process.env.S3_SECRET_KEY
                    ? {
                          accessKeyId: process.env.S3_ACCESS_KEY,
                          secretAccessKey: process.env.S3_SECRET_KEY,
                      }
                    : undefined,
        });
    }
    return s3Client;
}

export function getPlayLogS3Key(contentId: number, playId: number): string {
    const prefix = process.env.S3_KEY_PREFIX ?? "";
    return `${prefix}play-logs/${contentId}/${playId}.jsonl`;
}

export async function uploadPlayLog(
    contentId: number,
    playId: number,
    logs: string[],
): Promise<void> {
    const bucket = process.env.S3_BUCKET;
    if (!bucket) {
        throw new Error("S3_BUCKET is required.");
    }
    await getS3Client().send(
        new PutObjectCommand({
            Bucket: bucket,
            Key: getPlayLogS3Key(contentId, playId),
            Body: logs.join("\n"),
            ContentType: "application/x-ndjson",
        }),
    );
}
