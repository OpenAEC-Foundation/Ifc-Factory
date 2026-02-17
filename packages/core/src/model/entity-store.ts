import type { IfcGenericEntity } from '@ifc-factory/schema';

export class EntityStore {
  private entities = new Map<number, IfcGenericEntity>();
  private typeIndex = new Map<string, Set<number>>();

  get size(): number {
    return this.entities.size;
  }

  get(id: number): IfcGenericEntity | undefined {
    return this.entities.get(id);
  }

  set(entity: IfcGenericEntity): void {
    this.entities.set(entity.expressID, entity);
    this.addToTypeIndex(entity);
  }

  delete(id: number): boolean {
    const entity = this.entities.get(id);
    if (!entity) return false;
    this.entities.delete(id);
    this.removeFromTypeIndex(entity);
    return true;
  }

  has(id: number): boolean {
    return this.entities.has(id);
  }

  getAllOfType(typeName: string): IfcGenericEntity[] {
    const ids = this.typeIndex.get(typeName);
    if (!ids) return [];
    const result: IfcGenericEntity[] = [];
    for (const id of ids) {
      const entity = this.entities.get(id);
      if (entity) result.push(entity);
    }
    return result;
  }

  getAll(): IfcGenericEntity[] {
    return [...this.entities.values()];
  }

  getAllIds(): number[] {
    return [...this.entities.keys()];
  }

  [Symbol.iterator](): IterableIterator<[number, IfcGenericEntity]> {
    return this.entities.entries();
  }

  private addToTypeIndex(entity: IfcGenericEntity): void {
    let set = this.typeIndex.get(entity.type);
    if (!set) {
      set = new Set();
      this.typeIndex.set(entity.type, set);
    }
    set.add(entity.expressID);
  }

  private removeFromTypeIndex(entity: IfcGenericEntity): void {
    const set = this.typeIndex.get(entity.type);
    if (set) {
      set.delete(entity.expressID);
      if (set.size === 0) this.typeIndex.delete(entity.type);
    }
  }
}
