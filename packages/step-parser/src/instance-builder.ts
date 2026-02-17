import type { StepEntityInstance } from '@ifc-factory/step-serializer';
import {
  SCHEMA_METADATA,
  ENTITY_REGISTRY,
  type IfcGenericEntity,
} from '@ifc-factory/schema';
import { parseAttributeValue } from './value-parser.js';

export function buildTypedEntity(
  raw: StepEntityInstance,
): IfcGenericEntity {
  const typeName = ENTITY_REGISTRY[raw.typeName] ?? raw.typeName;
  const metadata = SCHEMA_METADATA[typeName];

  const entity: IfcGenericEntity = {
    expressID: raw.id,
    type: typeName,
  };

  if (metadata) {
    // Map positional attributes using schema metadata
    const attrs = metadata.allAttributes;
    for (let i = 0; i < attrs.length && i < raw.attributes.length; i++) {
      const attr = attrs[i]!;
      const rawVal = raw.attributes[i]!;
      entity[attr.name] = parseAttributeValue(rawVal, attr);
    }
  } else {
    // Unknown entity type — store raw attributes
    entity['_rawAttributes'] = raw.attributes.map((v) =>
      parseAttributeValue(v),
    );
  }

  return entity;
}
