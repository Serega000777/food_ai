import { Module } from "@nestjs/common";

import { ProgressController } from "./progress.controller";
import { ProgressService } from "./progress.service";
import { WeightsController } from "./weights.controller";

@Module({
  controllers: [WeightsController, ProgressController],
  providers: [ProgressService],
})
export class ProgressModule {}
