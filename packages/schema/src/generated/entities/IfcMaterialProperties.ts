import type { IfcExtendedProperties } from './IfcExtendedProperties.js';
import type { IfcMaterialDefinition } from './IfcMaterialDefinition.js';

export interface IfcMaterialProperties extends IfcExtendedProperties {
  Material: IfcMaterialDefinition;
}
