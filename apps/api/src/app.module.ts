import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";

import { validateEnv } from "./config/env";
import { DbModule } from "./db/db.module";
import { AiModule } from "./modules/ai/ai.module";
import { AnalyticsModule } from "./modules/analytics/analytics.module";
import { AuthModule } from "./modules/auth/auth.module";
import { DashboardModule } from "./modules/dashboard/dashboard.module";
import { DiaryModule } from "./modules/diary/diary.module";
import { FoodsModule } from "./modules/foods/foods.module";
import { GoalsModule } from "./modules/goals/goals.module";
import { HealthModule } from "./modules/health/health.module";
import { MealAnalysesModule } from "./modules/meal-analyses/meal-analyses.module";
import { MealsModule } from "./modules/meals/meals.module";
import { ProgressModule } from "./modules/progress/progress.module";
import { StorageModule } from "./modules/storage/storage.module";
import { UsersModule } from "./modules/users/users.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
      envFilePath: ["../../.env", ".env"],
    }),
    ThrottlerModule.forRoot({ throttlers: [{ limit: 100, ttl: 60_000 }] }),
    DbModule,
    AnalyticsModule,
    StorageModule,
    AiModule,
    AuthModule,
    UsersModule,
    GoalsModule,
    FoodsModule,
    MealsModule,
    MealAnalysesModule,
    DiaryModule,
    DashboardModule,
    ProgressModule,
    HealthModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
