import type { IfcBuiltElement } from './IfcBuiltElement.js';
import type { IfcShadingDeviceTypeEnum } from '../enums/IfcShadingDeviceTypeEnum.js';

export interface IfcShadingDevice extends IfcBuiltElement {
  PredefinedType?: IfcShadingDeviceTypeEnum | null;
}
