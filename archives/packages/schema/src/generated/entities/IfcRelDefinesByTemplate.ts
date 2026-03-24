import type { IfcRelDefines } from './IfcRelDefines.js';
import type { IfcPropertySetDefinition } from './IfcPropertySetDefinition.js';
import type { IfcPropertySetTemplate } from './IfcPropertySetTemplate.js';

export interface IfcRelDefinesByTemplate extends IfcRelDefines {
  RelatedPropertySets: IfcPropertySetDefinition[];
  RelatingTemplate: IfcPropertySetTemplate;
}
