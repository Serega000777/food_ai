import {
  CreateBucketCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Injectable, Logger, type OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import type { Env } from "../../config/env";

const DOWNLOAD_URL_TTL_SECONDS = 5 * 60;

/**
 * Thin, provider-agnostic wrapper (ADR 0011) — the same `S3Client` config talks to
 * local MinIO (`forcePathStyle: true`, required for MinIO's URL scheme) and to real
 * S3-compatible storage in production; swapping providers is a config change here,
 * never a call-site change.
 */
@Injectable()
export class ObjectStorageService implements OnModuleInit {
  private readonly logger = new Logger(ObjectStorageService.name);
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(config: ConfigService<Env, true>) {
    this.bucket = config.get("S3_BUCKET", { infer: true });
    this.client = new S3Client({
      endpoint: config.get("S3_ENDPOINT", { infer: true }),
      region: config.get("S3_REGION", { infer: true }),
      forcePathStyle: true,
      credentials: {
        accessKeyId: config.get("S3_ACCESS_KEY_ID", { infer: true }),
        secretAccessKey: config.get("S3_SECRET_ACCESS_KEY", { infer: true }),
      },
    });
  }

  /** Local dev/CI convenience — production buckets are provisioned out-of-band. */
  async onModuleInit(): Promise<void> {
    try {
      await this.client.send(new CreateBucketCommand({ Bucket: this.bucket }));
    } catch (error) {
      const code = (error as { Code?: string; name?: string }).Code ?? (error as Error).name;
      if (code === "BucketAlreadyOwnedByYou" || code === "BucketAlreadyExists") return;
      this.logger.warn(
        `Could not ensure bucket "${this.bucket}" exists: ${(error as Error).message}`,
      );
    }
  }

  async upload(key: string, body: Buffer, contentType: string): Promise<void> {
    await this.client.send(
      new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: body, ContentType: contentType }),
    );
  }

  async getObjectBuffer(key: string): Promise<Buffer> {
    const response = await this.client.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
    );
    const bytes = await response.Body?.transformToByteArray();
    if (!bytes) throw new Error(`Object "${key}" has no body`);
    return Buffer.from(bytes);
  }

  /** Meal photos are private by default (master prompt §10/§25) — always a short-lived
   * signed URL, never a public object URL. */
  getSignedDownloadUrl(key: string): Promise<string> {
    return getSignedUrl(this.client, new GetObjectCommand({ Bucket: this.bucket, Key: key }), {
      expiresIn: DOWNLOAD_URL_TTL_SECONDS,
    });
  }

  /** Used by account deletion (master prompt §26: "account deletion удаляет/очередит
   * удаление objects") — deleting an object that's already gone is not an error. */
  async deleteObject(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }
}
