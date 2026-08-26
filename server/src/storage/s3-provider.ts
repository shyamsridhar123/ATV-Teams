import type {
  S3Client,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { Readable } from "node:stream";
import type { StorageProvider, GetObjectResult, HeadObjectResult } from "./types.js";
import { notFound, unprocessable } from "../errors.js";

// @aws-sdk/client-s3 is an optional dependency: the fork does not use S3 storage
// by default, and requiring it at import time forces the whole AWS SDK tree to be
// installed on every deployment. Load it on demand so only operators who actually
// configure S3 need the package present.
type AwsS3Module = {
  S3Client: new (config: unknown) => S3Client;
  DeleteObjectCommand: typeof DeleteObjectCommand;
  GetObjectCommand: typeof GetObjectCommand;
  HeadObjectCommand: typeof HeadObjectCommand;
  PutObjectCommand: typeof PutObjectCommand;
};

let awsSdkPromise: Promise<AwsS3Module> | null = null;

async function loadAwsS3(): Promise<AwsS3Module> {
  if (!awsSdkPromise) {
    awsSdkPromise = import("@aws-sdk/client-s3").catch((err) => {
      awsSdkPromise = null;
      throw unprocessable(
        "S3 storage requires the optional @aws-sdk/client-s3 package. Install it with `pnpm add @aws-sdk/client-s3` in server/ to use the s3 storage provider.",
        { reason: err instanceof Error ? err.message : String(err) },
      );
    }) as Promise<AwsS3Module>;
  }
  return awsSdkPromise;
}


interface S3ProviderConfig {
  bucket: string;
  region: string;
  endpoint?: string;
  prefix?: string;
  forcePathStyle?: boolean;
}

function normalizePrefix(prefix: string | undefined): string {
  if (!prefix) return "";
  return prefix
    .trim()
    .replace(/^\/+/, "")
    .replace(/\/+$/, "");
}

function buildKey(prefix: string, objectKey: string): string {
  if (!prefix) return objectKey;
  return `${prefix}/${objectKey}`;
}

async function toReadableStream(body: unknown): Promise<Readable> {
  if (!body) throw notFound("Object not found");
  if (body instanceof Readable) return body;

  const candidate = body as {
    transformToWebStream?: () => ReadableStream<Uint8Array>;
    arrayBuffer?: () => Promise<ArrayBuffer>;
  };

  if (typeof candidate.transformToWebStream === "function") {
    const webStream = candidate.transformToWebStream();
    const reader = webStream.getReader();
    return Readable.from((async function* () {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) yield value;
      }
    })());
  }

  if (typeof candidate.arrayBuffer === "function") {
    const buffer = Buffer.from(await candidate.arrayBuffer());
    return Readable.from(buffer);
  }

  throw unprocessable("Unsupported S3 body stream type");
}

function toDate(value: Date | undefined): Date | undefined {
  return value instanceof Date ? value : undefined;
}

export function createS3StorageProvider(config: S3ProviderConfig): StorageProvider {
  const bucket = config.bucket.trim();
  const region = config.region.trim();
  if (!bucket) throw unprocessable("S3 storage bucket is required");
  if (!region) throw unprocessable("S3 storage region is required");

  const prefix = normalizePrefix(config.prefix);

  // Resolved on first use so the AWS SDK is never loaded for deployments that
  // configure a different storage provider.
  let sdkPromise: Promise<{ sdk: AwsS3Module; client: S3Client }> | null = null;
  async function resolve() {
    if (!sdkPromise) {
      sdkPromise = loadAwsS3().then((sdk) => ({
        sdk,
        client: new sdk.S3Client({
          region,
          endpoint: config.endpoint,
          forcePathStyle: Boolean(config.forcePathStyle),
        }),
      }));
    }
    return sdkPromise;
  }

  return {
    id: "s3",

    async putObject(input) {
      const { sdk, client } = await resolve();
      const key = buildKey(prefix, input.objectKey);
      await client.send(
        new sdk.PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: input.body,
          ContentType: input.contentType,
          ContentLength: input.contentLength,
        }),
      );
    },

    async getObject(input): Promise<GetObjectResult> {
      const { sdk, client } = await resolve();
      const key = buildKey(prefix, input.objectKey);
      try {
        const output = await client.send(
          new sdk.GetObjectCommand({
            Bucket: bucket,
            Key: key,
            Range: input.range ? `bytes=${input.range.start}-${input.range.end}` : undefined,
          }),
        );

        return {
          stream: await toReadableStream(output.Body),
          contentType: output.ContentType,
          contentLength: output.ContentLength,
          etag: output.ETag,
          lastModified: toDate(output.LastModified),
        };
      } catch (err) {
        const code = (err as { name?: string }).name;
        if (code === "NoSuchKey" || code === "NotFound") throw notFound("Object not found");
        throw err;
      }
    },

    async headObject(input): Promise<HeadObjectResult> {
      const { sdk, client } = await resolve();
      const key = buildKey(prefix, input.objectKey);
      try {
        const output = await client.send(
          new sdk.HeadObjectCommand({
            Bucket: bucket,
            Key: key,
          }),
        );

        return {
          exists: true,
          contentType: output.ContentType,
          contentLength: output.ContentLength,
          etag: output.ETag,
          lastModified: toDate(output.LastModified),
        };
      } catch (err) {
        const code = (err as { name?: string }).name;
        if (code === "NoSuchKey" || code === "NotFound") return { exists: false };
        throw err;
      }
    },

    async deleteObject(input): Promise<void> {
      const { sdk, client } = await resolve();
      const key = buildKey(prefix, input.objectKey);
      await client.send(
        new sdk.DeleteObjectCommand({
          Bucket: bucket,
          Key: key,
        }),
      );
    },
  };
}
