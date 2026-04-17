import * as process from "node:process";
import {
    DeleteObjectCommand,
    DeleteObjectsCommand,
    ListObjectsV2Command,
    S3Client,
} from "@aws-sdk/client-s3";

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

function getBucket(): string {
    if (!process.env.S3_BUCKET) {
        throw new Error("S3_BUCKET is required.");
    }
    return process.env.S3_BUCKET;
}

const keyPrefix = process.env.S3_KEY_PREFIX ?? "";

export function contentLogKey(contentId: number, playId: number): string {
    return `${keyPrefix}content-logs/${contentId}/${playId}.jsonl`;
}

export function clientLogPrefix(contentId: number, playId: number): string {
    return `${keyPrefix}client-logs/${contentId}/${playId}/`;
}

export async function deleteContentLog(
    contentId: number,
    playId: number,
): Promise<void> {
    await getS3Client().send(
        new DeleteObjectCommand({
            Bucket: getBucket(),
            Key: contentLogKey(contentId, playId),
        }),
    );
}

export async function deleteClientLogs(
    contentId: number,
    playId: number,
): Promise<void> {
    const bucket = getBucket();
    const prefix = clientLogPrefix(contentId, playId);
    let continuationToken: string | undefined;
    do {
        const res = await getS3Client().send(
            new ListObjectsV2Command({
                Bucket: bucket,
                Prefix: prefix,
                ContinuationToken: continuationToken,
            }),
        );
        const objects = (res.Contents ?? [])
            .map((obj) => obj.Key)
            .filter((key): key is string => Boolean(key))
            .map((key) => ({ Key: key }));
        if (objects.length > 0) {
            await getS3Client().send(
                new DeleteObjectsCommand({
                    Bucket: bucket,
                    Delete: { Objects: objects, Quiet: true },
                }),
            );
        }
        continuationToken = res.NextContinuationToken;
    } while (continuationToken);
}
