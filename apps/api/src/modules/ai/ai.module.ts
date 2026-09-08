import { GeminiVisionProvider, MockVisionProvider, type VisionProvider } from "@food-ai/ai";
import { Global, Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import type { Env } from "../../config/env";

import { VISION_PROVIDER } from "./vision-provider.token";

/** Selects the configured `VisionProvider` (ADR 0013) — the rest of the app depends
 * only on the `VisionProvider` interface via this token, never on `MockVisionProvider`
 * directly, so adding a real provider in Phase 5 is a new `case` here, not a
 * call-site change anywhere else. */
@Global()
@Module({
  providers: [
    {
      provide: VISION_PROVIDER,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>): VisionProvider => {
        const provider = config.get("AI_PROVIDER_PRIMARY", { infer: true });
        switch (provider) {
          case "mock":
            return new MockVisionProvider();
          case "gemini":
            // env.ts's refine() guarantees GEMINI_API_KEY is set whenever this branch runs.
            return new GeminiVisionProvider({
              apiKey: config.get("GEMINI_API_KEY", { infer: true }) as string,
              model: config.get("GEMINI_MODEL", { infer: true }),
            });
        }
      },
    },
  ],
  exports: [VISION_PROVIDER],
})
export class AiModule {}
