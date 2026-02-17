import type { IfcBuiltElementType } from './IfcBuiltElementType.js';
import type { IfcStairFlightTypeEnum } from '../enums/IfcStairFlightTypeEnum.js';

export interface IfcStairFlightType extends IfcBuiltElementType {
  PredefinedType: IfcStairFlightTypeEnum;
}
