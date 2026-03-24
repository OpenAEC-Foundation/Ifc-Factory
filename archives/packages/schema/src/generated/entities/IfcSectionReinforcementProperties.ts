import type { IfcPreDefinedProperties } from './IfcPreDefinedProperties.js';
import type { IfcLengthMeasure } from '../types/IfcLengthMeasure.js';
import type { IfcReinforcingBarRoleEnum } from '../enums/IfcReinforcingBarRoleEnum.js';
import type { IfcSectionProperties } from './IfcSectionProperties.js';
import type { IfcReinforcementBarProperties } from './IfcReinforcementBarProperties.js';

export interface IfcSectionReinforcementProperties extends IfcPreDefinedProperties {
  LongitudinalStartPosition: IfcLengthMeasure;
  LongitudinalEndPosition: IfcLengthMeasure;
  TransversePosition?: IfcLengthMeasure | null;
  ReinforcementRole: IfcReinforcingBarRoleEnum;
  SectionDefinition: IfcSectionProperties;
  CrossSectionReinforcementDefinitions: IfcReinforcementBarProperties[];
}
