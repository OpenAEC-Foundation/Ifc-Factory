import type { IfcBuiltElementType } from './IfcBuiltElementType.js';
import type { IfcColumnTypeEnum } from '../enums/IfcColumnTypeEnum.js';

export interface IfcColumnType extends IfcBuiltElementType {
  PredefinedType: IfcColumnTypeEnum;
}
