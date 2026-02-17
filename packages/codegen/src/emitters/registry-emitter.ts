export function emitEntityRegistry(entityNames: string[]): string {
  const lines: string[] = [];

  lines.push(
    'export const ENTITY_REGISTRY: Record<string, string> = {',
  );

  for (const name of entityNames) {
    lines.push(`  '${name.toUpperCase()}': '${name}',`);
  }

  lines.push('};');
  lines.push('');
  lines.push(
    'export function resolveEntityName(upperName: string): string | undefined {',
  );
  lines.push('  return ENTITY_REGISTRY[upperName];');
  lines.push('}');
  lines.push('');

  return lines.join('\n');
}
