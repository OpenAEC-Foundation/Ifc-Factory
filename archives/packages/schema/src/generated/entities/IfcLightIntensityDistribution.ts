import type { IfcLightDistributionCurveEnum } from '../enums/IfcLightDistributionCurveEnum.js';
import type { IfcLightDistributionData } from './IfcLightDistributionData.js';

export interface IfcLightIntensityDistribution {
  readonly type: string;
  LightDistributionCurve: IfcLightDistributionCurveEnum;
  DistributionData: IfcLightDistributionData[];
}
