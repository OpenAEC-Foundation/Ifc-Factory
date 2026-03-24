import type { IfcSolidModel } from './IfcSolidModel.js';
import type { IfcCurve } from './IfcCurve.js';
import type { IfcPositiveLengthMeasure } from '../types/IfcPositiveLengthMeasure.js';
import type { IfcParameterValue } from '../types/IfcParameterValue.js';

export interface IfcSweptDiskSolid extends IfcSolidModel {
  Directrix: IfcCurve;
  Radius: IfcPositiveLengthMeasure;
  InnerRadius?: IfcPositiveLengthMeasure | null;
  StartParam?: IfcParameterValue | null;
  EndParam?: IfcParameterValue | null;
}
