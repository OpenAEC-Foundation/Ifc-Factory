import type { IfcBuiltElementType } from './IfcBuiltElementType.js';
import type { IfcBeamTypeEnum } from '../enums/IfcBeamTypeEnum.js';

export interface IfcBeamType extends IfcBuiltElementType {
  PredefinedType: IfcBeamTypeEnum;
}
