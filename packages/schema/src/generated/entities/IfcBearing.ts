import type { IfcBuiltElement } from './IfcBuiltElement.js';
import type { IfcBearingTypeEnum } from '../enums/IfcBearingTypeEnum.js';

export interface IfcBearing extends IfcBuiltElement {
  PredefinedType?: IfcBearingTypeEnum | null;
}
