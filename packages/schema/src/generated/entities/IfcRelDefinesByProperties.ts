import type { IfcRelDefines } from './IfcRelDefines.js';
import type { IfcObjectDefinition } from './IfcObjectDefinition.js';
import type { IfcPropertySetDefinitionSelect } from '../selects/IfcPropertySetDefinitionSelect.js';

export interface IfcRelDefinesByProperties extends IfcRelDefines {
  RelatedObjects: IfcObjectDefinition[];
  RelatingPropertyDefinition: IfcPropertySetDefinitionSelect;
}
