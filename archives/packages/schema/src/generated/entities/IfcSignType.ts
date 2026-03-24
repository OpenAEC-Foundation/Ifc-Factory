import type { IfcElementComponentType } from './IfcElementComponentType.js';
import type { IfcSignTypeEnum } from '../enums/IfcSignTypeEnum.js';

export interface IfcSignType extends IfcElementComponentType {
  PredefinedType: IfcSignTypeEnum;
}
