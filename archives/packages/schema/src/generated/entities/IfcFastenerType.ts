import type { IfcElementComponentType } from './IfcElementComponentType.js';
import type { IfcFastenerTypeEnum } from '../enums/IfcFastenerTypeEnum.js';

export interface IfcFastenerType extends IfcElementComponentType {
  PredefinedType: IfcFastenerTypeEnum;
}
