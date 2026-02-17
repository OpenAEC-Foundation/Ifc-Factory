import type { IfcBuiltElementType } from './IfcBuiltElementType.js';
import type { IfcStairTypeEnum } from '../enums/IfcStairTypeEnum.js';

export interface IfcStairType extends IfcBuiltElementType {
  PredefinedType: IfcStairTypeEnum;
}
