import { BadRequestException, Injectable, PipeTransform } from "@nestjs/common";
import type { ZodType } from "zod";

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: ZodType) {}

  transform(value: unknown) {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;
      const firstError = Object.values(fieldErrors).flat()[0];
      throw new BadRequestException({
        message: firstError ?? "Datos inválidos",
        errors: fieldErrors,
      });
    }
    return result.data;
  }
}
