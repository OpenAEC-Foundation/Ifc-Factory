import type { IfcGenericEntity } from '@ifc-factory/schema';

export function resolveReferences(
  entities: Map<number, IfcGenericEntity>,
): void {
  // References are stored as numbers (expressIDs).
  // This function could optionally replace them with actual entity references,
  // but for now we keep them as IDs to avoid circular reference issues.
  // The IfcModel in core will provide relationship traversal methods.
}
