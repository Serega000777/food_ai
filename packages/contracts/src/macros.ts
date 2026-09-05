import { z } from "zod";

export const macrosSchema = z.object({
  calories: z.number(),
  proteinG: z.number(),
  fatG: z.number(),
  carbsG: z.number(),
});
export type Macros = z.infer<typeof macrosSchema>;
