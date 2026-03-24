import type { IfcBuiltElement } from './IfcBuiltElement.js';
import type { IfcFootingTypeEnum } from '../enums/IfcFootingTypeEnum.js';

export interface IfcFooting extends IfcBuiltElement {
  PredefinedType?: IfcFootingTypeEnum | null;
}
