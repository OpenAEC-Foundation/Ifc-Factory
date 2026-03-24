import type { IfcBuiltElementType } from './IfcBuiltElementType.js';
import type { IfcShadingDeviceTypeEnum } from '../enums/IfcShadingDeviceTypeEnum.js';

export interface IfcShadingDeviceType extends IfcBuiltElementType {
  PredefinedType: IfcShadingDeviceTypeEnum;
}
