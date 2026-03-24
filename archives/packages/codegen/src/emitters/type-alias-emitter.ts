import type { TypeDeclaration } from '@ifc-factory/express-parser';
import { mapExpressTypeToTS } from '../mapping.js';

export function emitTypeAlias(decl: TypeDeclaration): string | null {
  const ut = decl.underlyingType;

  // Skip enumerations and selects — they have their own emitters
  if (ut.kind === 'enumeration' || ut.kind === 'select') return null;

  const tsType = mapExpressTypeToTS(ut);
  return `export type ${decl.name} = ${tsType};\n`;
}
