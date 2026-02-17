import type { IfcRelDecomposes } from './IfcRelDecomposes.js';
import type { IfcObjectDefinition } from './IfcObjectDefinition.js';

export interface IfcRelNests extends IfcRelDecomposes {
  RelatingObject: IfcObjectDefinition;
  RelatedObjects: IfcObjectDefinition[];
}
