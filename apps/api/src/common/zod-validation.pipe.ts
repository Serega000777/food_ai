import { BadRequestException, type PipeTransform } from "@nestjs/common";
import type { ZodType } from "zod";

/** DTO validation is Zod-based (ADR 0005) — used as `new ZodValidationPipe(someSchema)`. */
export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: ZodType) {}

  transform(value: unknown) {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      // A `code` field is AllExceptionsFilter's signal to use this body as-is instead
      // of the generic per-status default (see its handling of HttpException).
      throw new BadRequestException({ code: "VALIDATION_ERROR", details: result.error.flatten() });
    }
    return result.data;
  }
}
