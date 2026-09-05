import { z } from "zod";

/**
 * Every API error response uses this envelope (see docs/API/README.md).
 * requestId lets a user-reported issue be traced back to server logs without
 * exposing stack traces or provider errors to the client (master prompt §36).
 */
export const errorEnvelopeSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.record(z.unknown()).optional(),
  requestId: z.string(),
});

export type ErrorEnvelope = z.infer<typeof errorEnvelopeSchema>;
