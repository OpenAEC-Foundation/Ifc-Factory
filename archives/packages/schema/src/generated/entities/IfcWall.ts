import type { IfcBuiltElement } from './IfcBuiltElement.js';
import type { IfcWallTypeEnum } from '../enums/IfcWallTypeEnum.js';

export interface IfcWall extends IfcBuiltElement {
  PredefinedType?: IfcWallTypeEnum | null;
}
