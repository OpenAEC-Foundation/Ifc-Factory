import { readStep } from '@ifc-factory/step-serializer';
import type { IfcGenericEntity } from '@ifc-factory/schema';
import { buildTypedEntity } from './instance-builder.js';
import { resolveReferences } from './reference-resolver.js';
import type { ParseOptions, ParseResult } from './types.js';

export function parseIfcStep(
  source: string,
  options: ParseOptions = {},
): ParseResult {
  // Pass 1: Parse raw STEP physical file
  const stepFile = readStep(source);

  // Pass 2: Build typed entities using schema metadata
  const entities = new Map<number, IfcGenericEntity>();
  for (const [id, raw] of stepFile.entities) {
    entities.set(id, buildTypedEntity(raw));
  }

  // Optional: resolve references
  if (options.resolveReferences !== false) {
    resolveReferences(entities);
  }

  return {
    schema: stepFile.header.schemas[0] ?? 'IFC4X3',
    entities,
    header: {
      name: stepFile.header.name,
      timeStamp: stepFile.header.timeStamp,
      schemas: stepFile.header.schemas,
    },
  };
}
