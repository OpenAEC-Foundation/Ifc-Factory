import type { IfcFeatureElementSubtraction } from './IfcFeatureElementSubtraction.js';
import type { IfcEarthworksCutTypeEnum } from '../enums/IfcEarthworksCutTypeEnum.js';

export interface IfcEarthworksCut extends IfcFeatureElementSubtraction {
  PredefinedType?: IfcEarthworksCutTypeEnum | null;
}
