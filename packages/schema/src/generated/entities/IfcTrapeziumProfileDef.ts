import type { IfcParameterizedProfileDef } from './IfcParameterizedProfileDef.js';
import type { IfcPositiveLengthMeasure } from '../types/IfcPositiveLengthMeasure.js';
import type { IfcLengthMeasure } from '../types/IfcLengthMeasure.js';

export interface IfcTrapeziumProfileDef extends IfcParameterizedProfileDef {
  BottomXDim: IfcPositiveLengthMeasure;
  TopXDim: IfcPositiveLengthMeasure;
  YDim: IfcPositiveLengthMeasure;
  TopXOffset: IfcLengthMeasure;
}
