import type { IfcBuiltElement } from './IfcBuiltElement.js';
import type { IfcCurtainWallTypeEnum } from '../enums/IfcCurtainWallTypeEnum.js';

export interface IfcCurtainWall extends IfcBuiltElement {
  PredefinedType?: IfcCurtainWallTypeEnum | null;
}
