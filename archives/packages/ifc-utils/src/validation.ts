import type { IfcModel } from '@ifc-factory/core';

export interface ValidationIssue {
  severity: 'error' | 'warning';
  entityId?: number;
  message: string;
}

export function validateModel(model: IfcModel): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // Check for IfcProject
  if (!model.project) {
    issues.push({
      severity: 'error',
      message: 'Model has no IfcProject entity',
    });
  }

  // Check for duplicate GlobalIds
  const globalIds = new Map<string, number>();
  for (let id = 1; id <= model.size * 2; id++) {
    const entity = model.get(id);
    if (!entity) continue;
    const guid = entity['GlobalId'] as string | undefined;
    if (guid) {
      const existing = globalIds.get(guid);
      if (existing !== undefined) {
        issues.push({
          severity: 'error',
          entityId: id,
          message: `Duplicate GlobalId '${guid}' (also on #${existing})`,
        });
      } else {
        globalIds.set(guid, id);
      }
    }
  }

  // Check for orphaned relationships
  const relTypes = [
    'IfcRelAggregates',
    'IfcRelContainedInSpatialStructure',
    'IfcRelDefinesByProperties',
  ];
  for (const relType of relTypes) {
    for (const rel of model.getAllOfType(relType)) {
      const relatingKey =
        relType === 'IfcRelContainedInSpatialStructure'
          ? 'RelatingStructure'
          : relType === 'IfcRelDefinesByProperties'
            ? 'RelatingPropertyDefinition'
            : 'RelatingObject';
      const relatingId = rel[relatingKey] as number | undefined;
      if (relatingId && !model.get(relatingId)) {
        issues.push({
          severity: 'warning',
          entityId: rel.expressID,
          message: `${relType} #${rel.expressID} references missing entity #${relatingId}`,
        });
      }
    }
  }

  return issues;
}
