import type { IfcBuiltElement } from './IfcBuiltElement.js';
import type { IfcRampTypeEnum } from '../enums/IfcRampTypeEnum.js';

export interface IfcRamp extends IfcBuiltElement {
  PredefinedType?: IfcRampTypeEnum | null;
}
