import type { IfcSpiral } from './IfcSpiral.js';
import type { IfcLengthMeasure } from '../types/IfcLengthMeasure.js';

export interface IfcSineSpiral extends IfcSpiral {
  SineTerm: IfcLengthMeasure;
  LinearTerm?: IfcLengthMeasure | null;
  ConstantTerm?: IfcLengthMeasure | null;
}
