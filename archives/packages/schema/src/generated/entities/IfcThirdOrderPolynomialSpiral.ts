import type { IfcSpiral } from './IfcSpiral.js';
import type { IfcLengthMeasure } from '../types/IfcLengthMeasure.js';

export interface IfcThirdOrderPolynomialSpiral extends IfcSpiral {
  CubicTerm: IfcLengthMeasure;
  QuadraticTerm?: IfcLengthMeasure | null;
  LinearTerm?: IfcLengthMeasure | null;
  ConstantTerm?: IfcLengthMeasure | null;
}
