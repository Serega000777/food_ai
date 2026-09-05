import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";

import { validateEnv } from "./config/env";
import { DbModule } from "./db/db.module";
import { AuthModule } from "./modules/auth/auth.module";
import { DashboardModule } from "./modules/dashboard/dashboard.module";
import { DiaryModule } from "./modules/diary/diary.module";
import { FoodsModule } from "./modules/foods/foods.module";
import { GoalsModule } from "./modules/goals/goals.module";
import { HealthModule } from "./modules/health/health.module";
import { MealsModule } from "./modules/meals/meals.module";
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
    AuthModule,
    UsersModule,
    GoalsModule,
    FoodsModule,
    MealsModule,
    DiaryModule,
    DashboardModule,
    HealthModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
