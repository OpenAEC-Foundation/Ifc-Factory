import type { IfcSpiral } from './IfcSpiral.js';
import type { IfcLengthMeasure } from '../types/IfcLengthMeasure.js';

export interface IfcSecondOrderPolynomialSpiral extends IfcSpiral {
  QuadraticTerm: IfcLengthMeasure;
  LinearTerm?: IfcLengthMeasure | null;
  ConstantTerm?: IfcLengthMeasure | null;
}
