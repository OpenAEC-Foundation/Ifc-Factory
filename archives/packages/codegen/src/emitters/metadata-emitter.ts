import type {
  EntityDeclaration,
  ExplicitAttribute,
} from '@ifc-factory/express-parser';
import { mapExpressTypeToTS } from '../mapping.js';
import { getAllAttributes } from './entity-emitter.js';

export interface AttributeMetadata {
  name: string;
  type: string;
  optional: boolean;
  isInherited: boolean;
}

export interface EntityMetadata {
  name: string;
  abstract: boolean;
  parent: string | null;
  allAttributes: AttributeMetadata[];
}

export function buildEntityMetadata(
  entity: EntityDeclaration,
  allEntities: Map<string, EntityDeclaration>,
): EntityMetadata {
  const allAttrs = getAllAttributes(entity.name, allEntities);
  const ownAttrNames = new Set(entity.attributes.map((a) => a.name));

  return {
    name: entity.name,
    abstract: entity.abstract,
    parent: entity.subtypeOf[0] ?? null,
    allAttributes: allAttrs.map((attr) => ({
      name: attr.name,
      type: mapExpressTypeToTS(attr.type),
      optional: attr.optional,
      isInherited: !ownAttrNames.has(attr.name),
    })),
  };
}

export function emitSchemaMetadata(
  entities: EntityDeclaration[],
  allEntities: Map<string, EntityDeclaration>,
): string {
  const lines: string[] = [];

  lines.push('export interface AttributeInfo {');
  lines.push('  name: string;');
  lines.push('  type: string;');
  lines.push('  optional: boolean;');
  lines.push('  isInherited: boolean;');
  lines.push('}');
  lines.push('');
  lines.push('export interface EntityInfo {');
  lines.push('  name: string;');
  lines.push('  abstract: boolean;');
  lines.push('  parent: string | null;');
  lines.push('  allAttributes: AttributeInfo[];');
  lines.push('}');
  lines.push('');
  lines.push(
    'export const SCHEMA_METADATA: Record<string, EntityInfo> = {',
  );

  for (const entity of entities) {
    const meta = buildEntityMetadata(entity, allEntities);
    lines.push(`  '${meta.name}': {`);
    lines.push(`    name: '${meta.name}',`);
    lines.push(`    abstract: ${meta.abstract},`);
    lines.push(
      `    parent: ${meta.parent ? `'${meta.parent}'` : 'null'},`,
    );
    lines.push('    allAttributes: [');
    for (const attr of meta.allAttributes) {
      lines.push(
        `      { name: '${attr.name}', type: '${attr.type}', optional: ${attr.optional}, isInherited: ${attr.isInherited} },`,
      );
    }
    lines.push('    ],');
    lines.push('  },');
  }

  lines.push('};');
  lines.push('');

  return lines.join('\n');
}
