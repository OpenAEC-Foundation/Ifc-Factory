import type { IfcBuiltElementType } from './IfcBuiltElementType.js';
import type { IfcBearingTypeEnum } from '../enums/IfcBearingTypeEnum.js';

export interface IfcBearingType extends IfcBuiltElementType {
  PredefinedType: IfcBearingTypeEnum;
}
