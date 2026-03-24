import type { IfcRelationship } from './IfcRelationship.js';
import type { IfcContext } from './IfcContext.js';
import type { IfcDefinitionSelect } from '../selects/IfcDefinitionSelect.js';

export interface IfcRelDeclares extends IfcRelationship {
  RelatingContext: IfcContext;
  RelatedDefinitions: IfcDefinitionSelect[];
}
