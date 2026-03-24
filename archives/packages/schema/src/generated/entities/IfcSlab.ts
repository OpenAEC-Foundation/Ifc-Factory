import type { IfcBuiltElement } from './IfcBuiltElement.js';
import type { IfcSlabTypeEnum } from '../enums/IfcSlabTypeEnum.js';

export interface IfcSlab extends IfcBuiltElement {
  PredefinedType?: IfcSlabTypeEnum | null;
}
