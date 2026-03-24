import type { IfcBuiltElementType } from './IfcBuiltElementType.js';
import type { IfcSlabTypeEnum } from '../enums/IfcSlabTypeEnum.js';

export interface IfcSlabType extends IfcBuiltElementType {
  PredefinedType: IfcSlabTypeEnum;
}
