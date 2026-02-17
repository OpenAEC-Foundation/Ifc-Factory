import type { IfcBuiltElementType } from './IfcBuiltElementType.js';
import type { IfcWallTypeEnum } from '../enums/IfcWallTypeEnum.js';

export interface IfcWallType extends IfcBuiltElementType {
  PredefinedType: IfcWallTypeEnum;
}
