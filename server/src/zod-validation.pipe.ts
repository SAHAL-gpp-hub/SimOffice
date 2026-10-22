import {
  PipeTransform,
  ArgumentMetadata,
  BadRequestException,
} from '@nestjs/common';
import { ZodSchema } from 'zod';

export class ZodValidationPipe implements PipeTransform {
  constructor(private schema: ZodSchema) {}

  transform(value: unknown, metadata: ArgumentMetadata) {
    if (metadata.type !== 'body') {
      return value;
    }
    console.log(`[ZodValidationPipe] validating body:`, value);
    try {
      const parsedValue = this.schema.parse(value);
      return parsedValue;
    } catch (error: any) {
      console.error('ZodValidationPipe failed for value:', value, 'Error:', error);
      throw new BadRequestException(`Validation failed: ${error.message || String(error)}`);
    }
  }
}
