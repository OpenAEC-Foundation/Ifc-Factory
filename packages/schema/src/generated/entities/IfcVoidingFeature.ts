import type { IfcFeatureElementSubtraction } from './IfcFeatureElementSubtraction.js';
import type { IfcVoidingFeatureTypeEnum } from '../enums/IfcVoidingFeatureTypeEnum.js';

export interface IfcVoidingFeature extends IfcFeatureElementSubtraction {
  PredefinedType?: IfcVoidingFeatureTypeEnum | null;
}
