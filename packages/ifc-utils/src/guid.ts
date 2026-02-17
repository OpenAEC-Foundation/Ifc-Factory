import { generateIfcGuid, isValidIfcGuid } from '@ifc-factory/core';

export function generateMultipleGuids(count: number): string[] {
  const guids: string[] = [];
  for (let i = 0; i < count; i++) {
    guids.push(generateIfcGuid());
  }
  return guids;
}

export function validateGuid(guid: string): { valid: boolean; error?: string } {
  if (guid.length !== 22) {
    return { valid: false, error: `Expected 22 characters, got ${guid.length}` };
  }
  if (!isValidIfcGuid(guid)) {
    return { valid: false, error: 'Contains invalid characters for IFC GUID' };
  }
  return { valid: true };
}

export { generateIfcGuid, isValidIfcGuid };
