import type { IfcBuiltElementType } from './IfcBuiltElementType.js';
import type { IfcCurtainWallTypeEnum } from '../enums/IfcCurtainWallTypeEnum.js';

export interface IfcCurtainWallType extends IfcBuiltElementType {
  PredefinedType: IfcCurtainWallTypeEnum;
}
