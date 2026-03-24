import type { IfcFeatureElement } from './IfcFeatureElement.js';
import type { IfcSurfaceFeatureTypeEnum } from '../enums/IfcSurfaceFeatureTypeEnum.js';

export interface IfcSurfaceFeature extends IfcFeatureElement {
  PredefinedType?: IfcSurfaceFeatureTypeEnum | null;
}
