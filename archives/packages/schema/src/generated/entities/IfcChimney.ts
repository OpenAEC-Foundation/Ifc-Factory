import type { IfcBuiltElement } from './IfcBuiltElement.js';
import type { IfcChimneyTypeEnum } from '../enums/IfcChimneyTypeEnum.js';

export interface IfcChimney extends IfcBuiltElement {
  PredefinedType?: IfcChimneyTypeEnum | null;
}
