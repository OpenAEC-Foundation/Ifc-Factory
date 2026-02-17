import type { TypeDeclaration, SelectType } from '@ifc-factory/express-parser';

export function emitSelect(decl: TypeDeclaration): string | null {
  const selectType = decl.underlyingType;
  if (selectType.kind !== 'select') return null;
  const st = selectType as SelectType;

  if (st.items.length === 0 && st.basedOn) {
    // Extensible select based on another
    return `export type ${decl.name} = ${st.basedOn};\n`;
  }

  const items = st.items.map((item) => item);
  const union = items.join(' | ');

  return `export type ${decl.name} = ${union || 'never'};\n`;
}

export function getSelectImports(
  decl: TypeDeclaration,
): string[] {
  const selectType = decl.underlyingType;
  if (selectType.kind !== 'select') return [];
  const st = selectType as SelectType;

  const imports = [...st.items];
  if (st.basedOn) imports.push(st.basedOn);
  return imports;
}
