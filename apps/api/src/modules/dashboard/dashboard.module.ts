import { Module } from "@nestjs/common";

import { DiaryModule } from "../diary/diary.module";

import { DashboardController } from "./dashboard.controller";
import { DashboardService } from "./dashboard.service";

@Module({
  imports: [DiaryModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
