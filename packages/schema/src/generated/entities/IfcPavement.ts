import type { IfcBuiltElement } from './IfcBuiltElement.js';
import type { IfcPavementTypeEnum } from '../enums/IfcPavementTypeEnum.js';

export interface IfcPavement extends IfcBuiltElement {
  PredefinedType?: IfcPavementTypeEnum | null;
}
