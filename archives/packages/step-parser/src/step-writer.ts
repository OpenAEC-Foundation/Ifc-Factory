import {
  writeStep,
  StepEntityRef,
  StepEnum,
  type StepFile,
  type StepEntityInstance,
  type StepHeader,
  type StepValue,
} from '@ifc-factory/step-serializer';
import {
  SCHEMA_METADATA,
  type IfcGenericEntity,
} from '@ifc-factory/schema';

export interface WriteOptions {
  schema?: string;
  description?: string;
  author?: string;
  organization?: string;
  application?: string;
}

export function writeIfcStep(
  entities: Map<number, IfcGenericEntity>,
  options: WriteOptions = {},
): string {
  const header: StepHeader = {
    description: [options.description ?? 'ViewDefinition [CoordinationView]'],
    implementationLevel: '2;1',
    name: '',
    timeStamp: new Date().toISOString().replace(/\.\d{3}Z$/, ''),
    author: [options.author ?? ''],
    organization: [options.organization ?? ''],
    preprocessorVersion: 'ifc-factory',
    originatingSystem: options.application ?? 'ifc-factory',
    authorization: '',
    schemas: [options.schema ?? 'IFC4X3'],
  };

  const stepEntities = new Map<number, StepEntityInstance>();

  for (const [id, entity] of entities) {
    const typeName = entity.type.toUpperCase();
    const metadata = SCHEMA_METADATA[entity.type];

    let attributes: StepValue[];
    if (metadata) {
      attributes = metadata.allAttributes.map((attr) =>
        toStepValue(entity[attr.name]),
      );
    } else {
      // Fallback for unknown types
      const raw = entity['_rawAttributes'];
      attributes = Array.isArray(raw)
        ? raw.map((v) => toStepValue(v))
        : [];
    }

    stepEntities.set(id, { id, typeName, attributes });
  }

  return writeStep({ header, entities: stepEntities });
}

function toStepValue(value: unknown): StepValue {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') {
    // Check if this is an entity reference (positive integer likely is)
    if (Number.isInteger(value) && value > 0) {
      // We can't definitively tell if it's a ref or just a number without type info.
      // Convention: entity refs are stored as numbers in IfcGenericEntity
      return value;
    }
    return value;
  }
  if (typeof value === 'string') {
    // Check if it looks like an enum value (all uppercase with underscores)
    if (/^[A-Z][A-Z0-9_]*$/.test(value)) {
      return new StepEnum(value);
    }
    return value;
  }
  if (typeof value === 'boolean') return value;
  if (Array.isArray(value)) return value.map(toStepValue);
  if (typeof value === 'object' && value !== null && 'type' in value && 'value' in value) {
    // Typed value
    const tv = value as { type: string; value: unknown };
    return {
      typeName: tv.type,
      value: toStepValue(tv.value),
    } as unknown as StepValue;
  }
  return null;
}
