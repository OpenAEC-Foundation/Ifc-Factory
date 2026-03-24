import type { UnderlyingType } from '@ifc-factory/express-parser';

export function toPascalCase(name: string): string {
  // IFC names are already PascalCase (e.g., IfcWall)
  return name;
}

export function toUpperCase(name: string): string {
  return name.toUpperCase();
}

export function mapExpressTypeToTS(type: UnderlyingType): string {
  switch (type.kind) {
    case 'simple':
      switch (type.type) {
        case 'INTEGER':
        case 'REAL':
        case 'NUMBER':
          return 'number';
        case 'BOOLEAN':
          return 'boolean';
        case 'LOGICAL':
          return 'boolean | null';
        case 'STRING':
          return 'string';
        case 'BINARY':
          return 'Uint8Array';
      }
      break;
    case 'named':
      return toPascalCase(type.name);
    case 'aggregation':
      return `${mapExpressTypeToTS(type.elementType)}[]`;
    case 'enumeration':
      return 'string';
    case 'select':
      return 'unknown';
  }
  return 'unknown';
}

export function mapExpressTypeToTSWithOptional(
  type: UnderlyingType,
  optional: boolean,
): string {
  const base = mapExpressTypeToTS(type);
  return optional ? `${base} | null` : base;
}

export function getImportsForType(
  type: UnderlyingType,
  currentFile: string,
): { name: string; from: string }[] {
  const imports: { name: string; from: string }[] = [];

  switch (type.kind) {
    case 'named':
      imports.push({ name: type.name, from: type.name });
      break;
    case 'aggregation':
      imports.push(...getImportsForType(type.elementType, currentFile));
      break;
  }

  return imports;
}
