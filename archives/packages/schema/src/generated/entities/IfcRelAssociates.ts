import type { IfcRelationship } from './IfcRelationship.js';
import type { IfcDefinitionSelect } from '../selects/IfcDefinitionSelect.js';

export interface IfcRelAssociates extends IfcRelationship {
  RelatedObjects: IfcDefinitionSelect[];
}
