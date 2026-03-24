import type { IfcBuiltElement } from './IfcBuiltElement.js';
import type { IfcRailTypeEnum } from '../enums/IfcRailTypeEnum.js';

export interface IfcRail extends IfcBuiltElement {
  PredefinedType?: IfcRailTypeEnum | null;
}
