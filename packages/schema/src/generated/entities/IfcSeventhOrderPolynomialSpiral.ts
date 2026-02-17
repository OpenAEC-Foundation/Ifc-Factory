import type { IfcSpiral } from './IfcSpiral.js';
import type { IfcLengthMeasure } from '../types/IfcLengthMeasure.js';

export interface IfcSeventhOrderPolynomialSpiral extends IfcSpiral {
  SepticTerm: IfcLengthMeasure;
  SexticTerm?: IfcLengthMeasure | null;
  QuinticTerm?: IfcLengthMeasure | null;
  QuarticTerm?: IfcLengthMeasure | null;
  CubicTerm?: IfcLengthMeasure | null;
  QuadraticTerm?: IfcLengthMeasure | null;
  LinearTerm?: IfcLengthMeasure | null;
  ConstantTerm?: IfcLengthMeasure | null;
}
