import type { IfcReinforcingElementType } from './IfcReinforcingElementType.js';
import type { IfcTendonTypeEnum } from '../enums/IfcTendonTypeEnum.js';
import type { IfcPositiveLengthMeasure } from '../types/IfcPositiveLengthMeasure.js';
import type { IfcAreaMeasure } from '../types/IfcAreaMeasure.js';

export interface IfcTendonType extends IfcReinforcingElementType {
  PredefinedType: IfcTendonTypeEnum;
  NominalDiameter?: IfcPositiveLengthMeasure | null;
  CrossSectionArea?: IfcAreaMeasure | null;
  SheathDiameter?: IfcPositiveLengthMeasure | null;
}
