import type { IfcBuiltElement } from './IfcBuiltElement.js';
import type { IfcRailingTypeEnum } from '../enums/IfcRailingTypeEnum.js';

export interface IfcRailing extends IfcBuiltElement {
  PredefinedType?: IfcRailingTypeEnum | null;
}
