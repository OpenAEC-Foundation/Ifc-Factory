import type { IfcElementComponentType } from './IfcElementComponentType.js';
import type { IfcMechanicalFastenerTypeEnum } from '../enums/IfcMechanicalFastenerTypeEnum.js';
import type { IfcPositiveLengthMeasure } from '../types/IfcPositiveLengthMeasure.js';

export interface IfcMechanicalFastenerType extends IfcElementComponentType {
  PredefinedType: IfcMechanicalFastenerTypeEnum;
  NominalDiameter?: IfcPositiveLengthMeasure | null;
  NominalLength?: IfcPositiveLengthMeasure | null;
}
