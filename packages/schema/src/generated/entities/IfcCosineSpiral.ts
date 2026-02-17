import type { IfcSpiral } from './IfcSpiral.js';
import type { IfcLengthMeasure } from '../types/IfcLengthMeasure.js';

export interface IfcCosineSpiral extends IfcSpiral {
  CosineTerm: IfcLengthMeasure;
  ConstantTerm?: IfcLengthMeasure | null;
}
