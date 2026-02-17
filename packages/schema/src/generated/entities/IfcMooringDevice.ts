import type { IfcBuiltElement } from './IfcBuiltElement.js';
import type { IfcMooringDeviceTypeEnum } from '../enums/IfcMooringDeviceTypeEnum.js';

export interface IfcMooringDevice extends IfcBuiltElement {
  PredefinedType?: IfcMooringDeviceTypeEnum | null;
}
