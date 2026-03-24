import type { IfcFeatureElementSubtraction } from './IfcFeatureElementSubtraction.js';
import type { IfcOpeningElementTypeEnum } from '../enums/IfcOpeningElementTypeEnum.js';

export interface IfcOpeningElement extends IfcFeatureElementSubtraction {
  PredefinedType?: IfcOpeningElementTypeEnum | null;
}
