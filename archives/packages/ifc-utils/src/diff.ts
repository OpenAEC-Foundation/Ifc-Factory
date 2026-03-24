import type { IfcModel } from '@ifc-factory/core';
import type { IfcGenericEntity } from '@ifc-factory/schema';

export interface ModelDiff {
  added: number[];
  removed: number[];
  modified: { id: number; changes: string[] }[];
}

export function diffModels(modelA: IfcModel, modelB: IfcModel): ModelDiff {
  const diff: ModelDiff = { added: [], removed: [], modified: [] };

  const idsA = new Set<number>();
  const idsB = new Set<number>();

  // Collect all IDs
  for (let id = 1; id <= Math.max(modelA.size, modelB.size) * 2; id++) {
    if (modelA.get(id)) idsA.add(id);
    if (modelB.get(id)) idsB.add(id);
  }

  // Find added and removed
  for (const id of idsB) {
    if (!idsA.has(id)) diff.added.push(id);
  }
  for (const id of idsA) {
    if (!idsB.has(id)) diff.removed.push(id);
  }

  // Find modified
  for (const id of idsA) {
    if (!idsB.has(id)) continue;
    const entityA = modelA.get(id)!;
    const entityB = modelB.get(id)!;
    const changes = compareEntities(entityA, entityB);
    if (changes.length > 0) {
      diff.modified.push({ id, changes });
    }
  }

  return diff;
}

function compareEntities(a: IfcGenericEntity, b: IfcGenericEntity): string[] {
  const changes: string[] = [];

  if (a.type !== b.type) {
    changes.push(`type: ${a.type} -> ${b.type}`);
  }

  const allKeys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const key of allKeys) {
    if (key === 'expressID' || key === 'type') continue;
    const va = JSON.stringify(a[key]);
    const vb = JSON.stringify(b[key]);
    if (va !== vb) {
      changes.push(`${key}: ${va} -> ${vb}`);
    }
  }

  return changes;
}
