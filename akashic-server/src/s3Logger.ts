import * as process from "node:process";
import { PassThrough } from "node:stream";
import { S3Client } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";

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

export function getContentLogS3Key(contentId: number, playId: number): string {
    const prefix = process.env.S3_KEY_PREFIX ?? "";
    return `${prefix}content-logs/${contentId}/${playId}.jsonl`;
}

export function createContentLogUpload(
    contentId: number,
    playId: number,
): { logStream: PassThrough; upload: Upload } {
    const bucket = process.env.S3_BUCKET;
    if (!bucket) {
        throw new Error("S3_BUCKET is required.");
    }
    const logStream = new PassThrough();
    const upload = new Upload({
        client: getS3Client(),
        params: {
            Bucket: bucket,
            Key: getContentLogS3Key(contentId, playId),
            Body: logStream,
            ContentType: "application/x-ndjson",
        },
        queueSize: 1,
        partSize: 5 * 1024 * 1024,
    });
    return { logStream, upload };
}
