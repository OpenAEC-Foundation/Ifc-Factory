import type { IfcModel } from '../model/ifc-model.js';
import type { IfcGenericEntity } from '@ifc-factory/schema';
import { generateIfcGuid } from '../guid/ifc-guid.js';

export interface PropertyValue {
  name: string;
  value: string | number | boolean;
  type?: string;
}

export function createPropertySet(
  model: IfcModel,
  name: string,
  properties: PropertyValue[],
): IfcGenericEntity {
  const propIds: number[] = [];

  for (const prop of properties) {
    const nominalValue = prop.type
      ? { type: prop.type, value: prop.value }
      : prop.value;

    const propEntity = model.create('IfcPropertySingleValue', {
      Name: prop.name,
      Description: null,
      NominalValue: nominalValue,
      Unit: null,
    });
    propIds.push(propEntity.expressID);
  }

  return model.create('IfcPropertySet', {
    GlobalId: generateIfcGuid(),
    Name: name,
    Description: null,
    HasProperties: propIds,
  });
}

export function createQuantitySet(
  model: IfcModel,
  name: string,
  quantities: { name: string; value: number; type: 'area' | 'length' | 'volume' | 'count' | 'weight' }[],
): IfcGenericEntity {
  const quantityIds: number[] = [];

  const typeMap = {
    area: 'IfcQuantityArea',
    length: 'IfcQuantityLength',
    volume: 'IfcQuantityVolume',
    count: 'IfcQuantityCount',
    weight: 'IfcQuantityWeight',
  };

  for (const q of quantities) {
    const quantityEntity = model.create(typeMap[q.type], {
      Name: q.name,
      Description: null,
      [`${q.type.charAt(0).toUpperCase()}${q.type.slice(1)}Value`]: q.value,
      Unit: null,
    });
    quantityIds.push(quantityEntity.expressID);
  }

  return model.create('IfcElementQuantity', {
    GlobalId: generateIfcGuid(),
    Name: name,
    Description: null,
    MethodOfMeasurement: null,
    Quantities: quantityIds,
  });
}

export function assignPropertySet(
  model: IfcModel,
  psetId: number,
  elementIds: number[],
): IfcGenericEntity {
  return model.create('IfcRelDefinesByProperties', {
    GlobalId: generateIfcGuid(),
    RelatedObjects: elementIds,
    RelatingPropertyDefinition: psetId,
  });
}

export function getPropertySets(
  model: IfcModel,
  entityId: number,
): IfcGenericEntity[] {
  const rels = model.getAllOfType('IfcRelDefinesByProperties');
  const psets: IfcGenericEntity[] = [];

  for (const rel of rels) {
    const relatedObjects = rel['RelatedObjects'] as number[] | undefined;
    if (relatedObjects?.includes(entityId)) {
      const psetId = rel['RelatingPropertyDefinition'] as number | undefined;
      if (psetId) {
        const pset = model.get(psetId);
        if (pset) psets.push(pset);
      }
    }
  }

  return psets;
}
