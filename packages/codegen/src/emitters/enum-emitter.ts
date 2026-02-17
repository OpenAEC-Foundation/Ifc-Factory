import type { TypeDeclaration, EnumerationType } from '@ifc-factory/express-parser';

export function emitEnum(decl: TypeDeclaration): string | null {
  const enumType = decl.underlyingType;
  if (enumType.kind !== 'enumeration') return null;
  const et = enumType as EnumerationType;

  const lines: string[] = [];
  lines.push(`export enum ${decl.name} {`);
  for (const item of et.items) {
    lines.push(`  ${item} = '${item}',`);
  }
  lines.push('}');
  lines.push('');

  return lines.join('\n');
}
