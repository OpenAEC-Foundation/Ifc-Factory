import type { IfcGenericEntity } from '@ifc-factory/schema';
import type { IfcModel } from '../model/ifc-model.js';
import type { EntityPredicate } from './filters.js';

export class QueryBuilder {
  private model: IfcModel;
  private predicates: EntityPredicate[] = [];
  private _typeName?: string;
  private _limit?: number;

  constructor(model: IfcModel) {
    this.model = model;
  }

  ofType(typeName: string): this {
    this._typeName = typeName;
    return this;
  }

  where(predicate: EntityPredicate): this {
    this.predicates.push(predicate);
    return this;
  }

  whereProperty(name: string, value: unknown): this {
    this.predicates.push((entity) => entity[name] === value);
    return this;
  }

  limit(n: number): this {
    this._limit = n;
    return this;
  }

  execute(): IfcGenericEntity[] {
    let entities: IfcGenericEntity[];
    if (this._typeName) {
      entities = this.model.getAllOfType(this._typeName);
    } else {
      entities = [];
      for (let id = 1; id <= this.model.size * 2; id++) {
        const e = this.model.get(id);
        if (e) entities.push(e);
      }
    }

    for (const predicate of this.predicates) {
      entities = entities.filter(predicate);
    }

    if (this._limit !== undefined) {
      entities = entities.slice(0, this._limit);
    }

    return entities;
  }

  first(): IfcGenericEntity | undefined {
    return this.limit(1).execute()[0];
  }

  count(): number {
    return this.execute().length;
  }
}
