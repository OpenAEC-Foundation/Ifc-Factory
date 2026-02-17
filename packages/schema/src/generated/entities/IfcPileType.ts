import type { IfcDeepFoundationType } from './IfcDeepFoundationType.js';
import type { IfcPileTypeEnum } from '../enums/IfcPileTypeEnum.js';

export interface IfcPileType extends IfcDeepFoundationType {
  PredefinedType: IfcPileTypeEnum;
}
