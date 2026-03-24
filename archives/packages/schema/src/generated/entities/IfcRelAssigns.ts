import type { IfcRelationship } from './IfcRelationship.js';
import type { IfcObjectDefinition } from './IfcObjectDefinition.js';
import type { IfcStrippedOptional } from '../types/IfcStrippedOptional.js';

export interface IfcRelAssigns extends IfcRelationship {
  RelatedObjects: IfcObjectDefinition[];
  RelatedObjectsType?: IfcStrippedOptional | null;
}
