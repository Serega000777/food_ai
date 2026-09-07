import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import type { Env } from "../../config/env";

import { ANALYZE_MEAL_PHOTO_QUEUE } from "./queue.constants";

/** Redis + BullMQ, introduced exactly now (ADR 0012) — `analyze-meal-photo` is the
 * only queue so far; a second job type registers its own `BullModule.registerQueue`
 * here when it exists, not before. */
@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => {
        // A plain options object (not a pre-built `Redis` instance) so BullMQ creates
        // and — crucially — closes its own connection on shutdown. Passing it our own
        // `ioredis` instance instead left it open on `app.close()` (visible as a
        // "worker failed to exit gracefully" warning under Jest).
        const url = new URL(config.get("REDIS_URL", { infer: true }));
        return {
          connection: {
            host: url.hostname,
            port: Number(url.port) || 6379,
            password: url.password || undefined,
            username: url.username || undefined,
            // Required by BullMQ on any Redis connection (blocking commands would
            // otherwise retry forever instead of surfacing failures).
            maxRetriesPerRequest: null,
          },
        };
      },
    }),
    BullModule.registerQueue({
      name: ANALYZE_MEAL_PHOTO_QUEUE,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: "exponential", delay: 1000 },
        removeOnComplete: { age: 24 * 60 * 60 },
        removeOnFail: { age: 7 * 24 * 60 * 60 },
      },
    }),
  ],
  exports: [BullModule],
})
export class QueueModule {}
