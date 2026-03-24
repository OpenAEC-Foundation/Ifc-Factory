import type { IfcPlaneAngleMeasure } from '../types/IfcPlaneAngleMeasure.js';
import type { IfcLuminousIntensityDistributionMeasure } from '../types/IfcLuminousIntensityDistributionMeasure.js';

export interface IfcLightDistributionData {
  readonly type: string;
  MainPlaneAngle: IfcPlaneAngleMeasure;
  SecondaryPlaneAngle: IfcPlaneAngleMeasure[];
  LuminousIntensity: IfcLuminousIntensityDistributionMeasure[];
}
