import { z } from "zod";

import { macrosSchema } from "./macros";
import { mealEntryDtoSchema } from "./meal";

export const diaryQuerySchema = z.object({
  date: z.string().date().optional(),
});
export type DiaryQuery = z.infer<typeof diaryQuerySchema>;

export const diaryResponseSchema = z.object({
  date: z.string(),
  meals: z.array(mealEntryDtoSchema),
  totals: macrosSchema,
});
export type DiaryResponse = z.infer<typeof diaryResponseSchema>;
