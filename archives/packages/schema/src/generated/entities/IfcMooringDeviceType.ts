import type { IfcBuiltElementType } from './IfcBuiltElementType.js';
import type { IfcMooringDeviceTypeEnum } from '../enums/IfcMooringDeviceTypeEnum.js';

export interface IfcMooringDeviceType extends IfcBuiltElementType {
  PredefinedType: IfcMooringDeviceTypeEnum;
}
