import type { IfcBuiltElement } from './IfcBuiltElement.js';
import type { IfcCoveringTypeEnum } from '../enums/IfcCoveringTypeEnum.js';

export interface IfcCovering extends IfcBuiltElement {
  PredefinedType?: IfcCoveringTypeEnum | null;
}
