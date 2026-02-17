import type { IfcDeepFoundation } from './IfcDeepFoundation.js';
import type { IfcPileTypeEnum } from '../enums/IfcPileTypeEnum.js';
import type { IfcPileConstructionEnum } from '../enums/IfcPileConstructionEnum.js';

export interface IfcPile extends IfcDeepFoundation {
  PredefinedType?: IfcPileTypeEnum | null;
  ConstructionType?: IfcPileConstructionEnum | null;
}
