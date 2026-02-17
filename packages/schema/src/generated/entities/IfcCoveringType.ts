import type { IfcBuiltElementType } from './IfcBuiltElementType.js';
import type { IfcCoveringTypeEnum } from '../enums/IfcCoveringTypeEnum.js';

export interface IfcCoveringType extends IfcBuiltElementType {
  PredefinedType: IfcCoveringTypeEnum;
}
