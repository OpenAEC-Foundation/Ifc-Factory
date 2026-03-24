import type { IfcBuiltElement } from './IfcBuiltElement.js';
import type { IfcRoofTypeEnum } from '../enums/IfcRoofTypeEnum.js';

export interface IfcRoof extends IfcBuiltElement {
  PredefinedType?: IfcRoofTypeEnum | null;
}
