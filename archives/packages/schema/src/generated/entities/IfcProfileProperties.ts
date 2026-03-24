import type { IfcExtendedProperties } from './IfcExtendedProperties.js';
import type { IfcProfileDef } from './IfcProfileDef.js';

export interface IfcProfileProperties extends IfcExtendedProperties {
  ProfileDefinition: IfcProfileDef;
}
