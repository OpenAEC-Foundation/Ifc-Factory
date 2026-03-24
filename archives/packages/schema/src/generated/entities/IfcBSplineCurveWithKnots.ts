import type { IfcBSplineCurve } from './IfcBSplineCurve.js';
import type { IfcInteger } from '../types/IfcInteger.js';
import type { IfcParameterValue } from '../types/IfcParameterValue.js';
import type { IfcKnotType } from '../enums/IfcKnotType.js';

export interface IfcBSplineCurveWithKnots extends IfcBSplineCurve {
  KnotMultiplicities: IfcInteger[];
  Knots: IfcParameterValue[];
  KnotSpec: IfcKnotType;
}
