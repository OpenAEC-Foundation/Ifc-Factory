import type { IfcGenericEntity } from '@ifc-factory/schema';

export type EntityPredicate = (entity: IfcGenericEntity) => boolean;

export function byType(typeName: string): EntityPredicate {
  return (entity) => entity.type === typeName;
}

export function byProperty(name: string, value: unknown): EntityPredicate {
  return (entity) => entity[name] === value;
}

export function byPropertyExists(name: string): EntityPredicate {
  return (entity) => entity[name] !== undefined && entity[name] !== null;
}

export function and(...predicates: EntityPredicate[]): EntityPredicate {
  return (entity) => predicates.every((p) => p(entity));
}

export function or(...predicates: EntityPredicate[]): EntityPredicate {
  return (entity) => predicates.some((p) => p(entity));
}

export function not(predicate: EntityPredicate): EntityPredicate {
  return (entity) => !predicate(entity);
}
