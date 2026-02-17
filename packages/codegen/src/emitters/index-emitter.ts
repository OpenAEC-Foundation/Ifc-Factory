export function emitBarrelExport(
  files: { name: string; path: string }[],
  useTypeExport: boolean,
): string {
  const lines: string[] = [];

  for (const file of files) {
    const keyword = useTypeExport ? 'export type' : 'export';
    lines.push(`${keyword} { ${file.name} } from '${file.path}';`);
  }

  lines.push('');
  return lines.join('\n');
}

export function emitFullBarrel(
  entityNames: string[],
  enumNames: string[],
  typeNames: string[],
  selectNames: string[],
): string {
  const lines: string[] = [];

  // Re-export all entities
  for (const name of entityNames) {
    lines.push(`export type { ${name} } from './entities/${name}.js';`);
  }

  // Re-export all enums
  for (const name of enumNames) {
    lines.push(`export { ${name} } from './enums/${name}.js';`);
  }

  // Re-export all type aliases
  for (const name of typeNames) {
    lines.push(`export type { ${name} } from './types/${name}.js';`);
  }

  // Re-export all selects
  for (const name of selectNames) {
    lines.push(`export type { ${name} } from './selects/${name}.js';`);
  }

  // Re-export metadata and registry
  lines.push(
    "export { SCHEMA_METADATA } from './metadata/schema-metadata.js';",
  );
  lines.push("export type { EntityInfo, AttributeInfo } from './metadata/schema-metadata.js';");
  lines.push(
    "export { ENTITY_REGISTRY, resolveEntityName } from './metadata/entity-registry.js';",
  );

  lines.push('');
  return lines.join('\n');
}
