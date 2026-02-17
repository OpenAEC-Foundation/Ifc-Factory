export type IfcSchemaVersion = 'IFC2X3' | 'IFC4' | 'IFC4X1' | 'IFC4X2' | 'IFC4X3' | 'UNKNOWN';

export function detectSchemaVersion(stepSource: string): IfcSchemaVersion {
  const match = stepSource.match(/FILE_SCHEMA\s*\(\s*\(\s*'([^']+)'/i);
  if (!match) return 'UNKNOWN';

  const schema = match[1]!.toUpperCase();

  if (schema.includes('IFC4X3')) return 'IFC4X3';
  if (schema.includes('IFC4X2')) return 'IFC4X2';
  if (schema.includes('IFC4X1')) return 'IFC4X1';
  if (schema.includes('IFC4')) return 'IFC4';
  if (schema.includes('IFC2X3')) return 'IFC2X3';

  return 'UNKNOWN';
}

export function isIfc4x3(stepSource: string): boolean {
  return detectSchemaVersion(stepSource) === 'IFC4X3';
}
