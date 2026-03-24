import type { IfcModel } from '@ifc-factory/core';
import { createPropertySet, assignPropertySet, type PropertyValue } from '@ifc-factory/core';

export function batchAssignProperties(
  model: IfcModel,
  assignments: {
    elementIds: number[];
    psetName: string;
    properties: PropertyValue[];
  }[],
): void {
  for (const assignment of assignments) {
    const pset = createPropertySet(
      model,
      assignment.psetName,
      assignment.properties,
    );
    assignPropertySet(model, pset.expressID, assignment.elementIds);
  }
}

export function batchUpdateProperty(
  model: IfcModel,
  entityIds: number[],
  propertyName: string,
  value: unknown,
): number {
  let updated = 0;
  for (const id of entityIds) {
    const entity = model.get(id);
    if (entity) {
      model.update(id, { [propertyName]: value });
      updated++;
    }
  }
  return updated;
}
