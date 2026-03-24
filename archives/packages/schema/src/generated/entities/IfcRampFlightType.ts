import type { IfcBuiltElementType } from './IfcBuiltElementType.js';
import type { IfcRampFlightTypeEnum } from '../enums/IfcRampFlightTypeEnum.js';

export interface IfcRampFlightType extends IfcBuiltElementType {
  PredefinedType: IfcRampFlightTypeEnum;
}
