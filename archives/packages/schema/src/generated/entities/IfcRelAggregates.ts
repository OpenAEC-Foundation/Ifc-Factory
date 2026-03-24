import type { IfcRelDecomposes } from './IfcRelDecomposes.js';
import type { IfcObjectDefinition } from './IfcObjectDefinition.js';

export interface IfcRelAggregates extends IfcRelDecomposes {
  RelatingObject: IfcObjectDefinition;
  RelatedObjects: IfcObjectDefinition[];
}
