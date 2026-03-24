import type { IfcGenericEntity } from '@ifc-factory/schema';

export class RelationshipIndex {
  // Spatial containment: spatialId → Set<elementId>
  private containedIn = new Map<number, Set<number>>();
  // Aggregation: parentId → Set<childId>
  private aggregates = new Map<number, Set<number>>();
  // Property association: entityId → Set<relId>
  private propertyRels = new Map<number, Set<number>>();
  // Generic relationship: relId → { relatingId, relatedIds }
  private relationships = new Map<number, { relating: number; related: number[] }>();

  rebuild(entities: Iterable<[number, IfcGenericEntity]>): void {
    this.containedIn.clear();
    this.aggregates.clear();
    this.propertyRels.clear();
    this.relationships.clear();

    for (const [_id, entity] of entities) {
      this.indexEntity(entity);
    }
  }

  indexEntity(entity: IfcGenericEntity): void {
    const type = entity.type;

    if (type === 'IfcRelContainedInSpatialStructure') {
      const spatialId = entity['RelatingStructure'] as number | undefined;
      const elements = entity['RelatedElements'] as number[] | undefined;
      if (spatialId && elements) {
        let set = this.containedIn.get(spatialId);
        if (!set) {
          set = new Set();
          this.containedIn.set(spatialId, set);
        }
        for (const el of elements) set.add(el);
      }
    }

    if (type === 'IfcRelAggregates') {
      const parentId = entity['RelatingObject'] as number | undefined;
      const children = entity['RelatedObjects'] as number[] | undefined;
      if (parentId && children) {
        let set = this.aggregates.get(parentId);
        if (!set) {
          set = new Set();
          this.aggregates.set(parentId, set);
        }
        for (const ch of children) set.add(ch);
      }
    }

    if (type === 'IfcRelDefinesByProperties') {
      const relatedIds = entity['RelatedObjects'] as number[] | undefined;
      if (relatedIds) {
        for (const relId of relatedIds) {
          let set = this.propertyRels.get(relId);
          if (!set) {
            set = new Set();
            this.propertyRels.set(relId, set);
          }
          set.add(entity.expressID);
        }
      }
    }
  }

  removeEntity(id: number): void {
    this.containedIn.delete(id);
    this.aggregates.delete(id);
    this.propertyRels.delete(id);
    // Also remove from all sets
    for (const set of this.containedIn.values()) set.delete(id);
    for (const set of this.aggregates.values()) set.delete(id);
    for (const set of this.propertyRels.values()) set.delete(id);
  }

  getContainedElements(spatialId: number): number[] {
    return [...(this.containedIn.get(spatialId) ?? [])];
  }

  getAggregateChildren(parentId: number): number[] {
    return [...(this.aggregates.get(parentId) ?? [])];
  }

  getPropertyRelations(entityId: number): number[] {
    return [...(this.propertyRels.get(entityId) ?? [])];
  }
}
