import type { IfcArbitraryOpenProfileDef } from './IfcArbitraryOpenProfileDef.js';
import type { IfcPositiveLengthMeasure } from '../types/IfcPositiveLengthMeasure.js';

export interface IfcCenterLineProfileDef extends IfcArbitraryOpenProfileDef {
  Thickness: IfcPositiveLengthMeasure;
}
