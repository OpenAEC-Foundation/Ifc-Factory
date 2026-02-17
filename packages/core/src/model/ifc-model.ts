import type { IfcGenericEntity } from '@ifc-factory/schema';
import { parseIfcStep } from '@ifc-factory/step-parser';
import { writeIfcStep } from '@ifc-factory/step-parser';
import { EntityStore } from './entity-store.js';
import { IdManager } from './id-manager.js';
import { RelationshipIndex } from './relationship-index.js';
import { generateIfcGuid } from '../guid/ifc-guid.js';

export interface SpatialTreeNode {
  entity: IfcGenericEntity;
  children: SpatialTreeNode[];
}

export class IfcModel {
  private store: EntityStore;
  private idManager: IdManager;
  private relIndex: RelationshipIndex;
  private _schema: string;

  constructor() {
    this.store = new EntityStore();
    this.idManager = new IdManager();
    this.relIndex = new RelationshipIndex();
    this._schema = 'IFC4X3';
  }

  // ─── Construction ──────────────────────────────────────────

  static fromStep(source: string): IfcModel {
    const model = new IfcModel();
    const result = parseIfcStep(source);
    model._schema = result.schema;

    for (const [id, entity] of result.entities) {
      model.store.set(entity);
    }

    model.idManager = new IdManager(result.entities.keys());
    model.relIndex.rebuild(model.store);
    return model;
  }

  toStep(): string {
    const entities = new Map<number, IfcGenericEntity>();
    for (const [id, entity] of this.store) {
      entities.set(id, entity);
    }
    return writeIfcStep(entities, { schema: this._schema });
  }

  // ─── Entity CRUD ───────────────────────────────────────────

  get(id: number): IfcGenericEntity | undefined {
    return this.store.get(id);
  }

  create(typeName: string, attributes: Record<string, unknown> = {}): IfcGenericEntity {
    const id = this.idManager.allocate();
    const entity: IfcGenericEntity = {
      expressID: id,
      type: typeName,
      ...attributes,
    };
    this.store.set(entity);
    this.relIndex.indexEntity(entity);
    return entity;
  }

  update(id: number, changes: Record<string, unknown>): void {
    const entity = this.store.get(id);
    if (!entity) throw new Error(`Entity #${id} not found`);

    for (const [key, value] of Object.entries(changes)) {
      if (key !== 'expressID' && key !== 'type') {
        (entity as Record<string, unknown>)[key] = value;
      }
    }

    // Re-index if this is a relationship entity
    this.relIndex.removeEntity(id);
    this.relIndex.indexEntity(entity);
  }

  delete(id: number, options?: { cascade?: boolean }): void {
    if (options?.cascade) {
      // Delete children recursively
      const children = this.relIndex.getAggregateChildren(id);
      for (const childId of children) {
        this.delete(childId, { cascade: true });
      }
    }

    this.relIndex.removeEntity(id);
    this.store.delete(id);
  }

  getAllOfType(typeName: string): IfcGenericEntity[] {
    return this.store.getAllOfType(typeName);
  }

  // ─── Spatial ───────────────────────────────────────────────

  getSpatialTree(): SpatialTreeNode | null {
    const projects = this.store.getAllOfType('IfcProject');
    if (projects.length === 0) return null;
    const project = projects[0]!;
    return this.buildSpatialNode(project);
  }

  private buildSpatialNode(entity: IfcGenericEntity): SpatialTreeNode {
    const childIds = [
      ...this.relIndex.getAggregateChildren(entity.expressID),
      ...this.relIndex.getContainedElements(entity.expressID),
    ];

    const children: SpatialTreeNode[] = [];
    for (const childId of childIds) {
      const child = this.store.get(childId);
      if (child) {
        children.push(this.buildSpatialNode(child));
      }
    }

    return { entity, children };
  }

  getAggregateChildren(parentId: number): IfcGenericEntity[] {
    const ids = this.relIndex.getAggregateChildren(parentId);
    return ids
      .map((id) => this.store.get(id))
      .filter((e): e is IfcGenericEntity => e !== undefined);
  }

  getContainedElements(spatialId: number): IfcGenericEntity[] {
    const ids = this.relIndex.getContainedElements(spatialId);
    return ids
      .map((id) => this.store.get(id))
      .filter((e): e is IfcGenericEntity => e !== undefined);
  }

  containInSpatialStructure(spatialId: number, elementId: number): void {
    // Find or create IfcRelContainedInSpatialStructure
    const rels = this.store.getAllOfType('IfcRelContainedInSpatialStructure');
    const existingRel = rels.find(
      (r) => (r['RelatingStructure'] as number) === spatialId,
    );

    if (existingRel) {
      const elements = (existingRel['RelatedElements'] as number[]) ?? [];
      if (!elements.includes(elementId)) {
        elements.push(elementId);
        this.update(existingRel.expressID, { RelatedElements: elements });
      }
    } else {
      this.create('IfcRelContainedInSpatialStructure', {
        GlobalId: generateIfcGuid(),
        OwnerHistory: null,
        Name: null,
        Description: null,
        RelatedElements: [elementId],
        RelatingStructure: spatialId,
      });
    }
  }

  // ─── Properties ────────────────────────────────────────────

  get project(): IfcGenericEntity | undefined {
    return this.store.getAllOfType('IfcProject')[0];
  }

  get size(): number {
    return this.store.size;
  }

  get schema(): string {
    return this._schema;
  }
}
