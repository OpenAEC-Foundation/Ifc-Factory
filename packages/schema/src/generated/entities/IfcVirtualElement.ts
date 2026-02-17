import type { IfcElement } from './IfcElement.js';
import type { IfcVirtualElementTypeEnum } from '../enums/IfcVirtualElementTypeEnum.js';

export interface IfcVirtualElement extends IfcElement {
  PredefinedType?: IfcVirtualElementTypeEnum | null;
}
