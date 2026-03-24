import type { IfcRepresentationItem } from './IfcRepresentationItem.js';
import type { IfcRepresentationMap } from './IfcRepresentationMap.js';
import type { IfcCartesianTransformationOperator } from './IfcCartesianTransformationOperator.js';

export interface IfcMappedItem extends IfcRepresentationItem {
  MappingSource: IfcRepresentationMap;
  MappingTarget: IfcCartesianTransformationOperator;
}
