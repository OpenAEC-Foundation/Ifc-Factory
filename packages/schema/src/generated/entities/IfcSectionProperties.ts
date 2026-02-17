import type { IfcPreDefinedProperties } from './IfcPreDefinedProperties.js';
import type { IfcSectionTypeEnum } from '../enums/IfcSectionTypeEnum.js';
import type { IfcProfileDef } from './IfcProfileDef.js';

export interface IfcSectionProperties extends IfcPreDefinedProperties {
  SectionType: IfcSectionTypeEnum;
  StartProfile: IfcProfileDef;
  EndProfile?: IfcProfileDef | null;
}
