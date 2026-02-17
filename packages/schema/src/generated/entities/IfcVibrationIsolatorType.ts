import type { IfcElementComponentType } from './IfcElementComponentType.js';
import type { IfcVibrationIsolatorTypeEnum } from '../enums/IfcVibrationIsolatorTypeEnum.js';

export interface IfcVibrationIsolatorType extends IfcElementComponentType {
  PredefinedType: IfcVibrationIsolatorTypeEnum;
}
