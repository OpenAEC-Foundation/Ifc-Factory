import type { IfcBuiltElement } from './IfcBuiltElement.js';
import type { IfcBeamTypeEnum } from '../enums/IfcBeamTypeEnum.js';

export interface IfcBeam extends IfcBuiltElement {
  PredefinedType?: IfcBeamTypeEnum | null;
}
