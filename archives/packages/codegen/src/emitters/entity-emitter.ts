import type { EntityDeclaration, ExplicitAttribute } from '@ifc-factory/express-parser';
import { mapExpressTypeToTS, getImportsForType } from '../mapping.js';

export interface EntityTypeInfo {
  name: string;
  imports: Set<string>;
  content: string;
}

export function emitEntity(
  decl: EntityDeclaration,
  allEntities: Map<string, EntityDeclaration>,
  allTypes: Map<string, string>,
): EntityTypeInfo {
  const imports = new Set<string>();
  const lines: string[] = [];

  // Collect parent imports
  for (const parent of decl.subtypeOf) {
    imports.add(parent);
  }

  // Build interface
  const extendsClause =
    decl.subtypeOf.length > 0 ? ` extends ${decl.subtypeOf.join(', ')}` : '';

  lines.push(`export interface ${decl.name}${extendsClause} {`);
  if (decl.subtypeOf.length === 0) {
    // Root-level entity: declare type as string
    lines.push(`  readonly type: string;`);
  }
  // All other entities inherit type from their parent — no redeclaration

  // Only emit own attributes (not inherited)
  for (const attr of decl.attributes) {
    const tsType = resolveAttributeType(attr, imports, allTypes);
    const opt = attr.optional ? '?' : '';
    lines.push(`  ${attr.name}${opt}: ${tsType};`);
  }

  lines.push('}');
  lines.push('');

  return {
    name: decl.name,
    imports,
    content: lines.join('\n'),
  };
}

function resolveAttributeType(
  attr: ExplicitAttribute,
  imports: Set<string>,
  allTypes: Map<string, string>,
): string {
  const tsType = mapExpressTypeToTS(attr.type);
  const typeImports = getImportsForType(attr.type, '');
  for (const imp of typeImports) {
    imports.add(imp.name);
  }

  if (attr.optional) {
    return `${tsType} | null`;
  }
  return tsType;
}

export function getAllAttributes(
  entityName: string,
  allEntities: Map<string, EntityDeclaration>,
): ExplicitAttribute[] {
  const entity = allEntities.get(entityName);
  if (!entity) return [];

  const parentAttrs: ExplicitAttribute[] = [];
  for (const parent of entity.subtypeOf) {
    parentAttrs.push(...getAllAttributes(parent, allEntities));
  }

  return [...parentAttrs, ...entity.attributes];
}
