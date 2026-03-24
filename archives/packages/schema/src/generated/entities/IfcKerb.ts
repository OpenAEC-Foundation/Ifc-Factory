import type { IfcBuiltElement } from './IfcBuiltElement.js';
import type { IfcKerbTypeEnum } from '../enums/IfcKerbTypeEnum.js';

export interface IfcKerb extends IfcBuiltElement {
  PredefinedType?: IfcKerbTypeEnum | null;
}
