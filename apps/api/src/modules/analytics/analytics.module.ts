import { Global, Module } from "@nestjs/common";

import { AnalyticsService } from "./analytics.service";

/** Global like DbModule/AiModule (ADR pattern) — nearly every feature module ends up
 * wanting to record an event, and threading `AnalyticsModule` through each one's
 * `imports` would be pure boilerplate for a dependency this cross-cutting. */
@Global()
@Module({
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
