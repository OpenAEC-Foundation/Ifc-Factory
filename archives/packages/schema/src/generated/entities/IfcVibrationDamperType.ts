import type { IfcElementComponentType } from './IfcElementComponentType.js';
import type { IfcVibrationDamperTypeEnum } from '../enums/IfcVibrationDamperTypeEnum.js';

export interface IfcVibrationDamperType extends IfcElementComponentType {
  PredefinedType: IfcVibrationDamperTypeEnum;
}
