import type { IfcStructuralConnectionCondition } from './IfcStructuralConnectionCondition.js';
import type { IfcLengthMeasure } from '../types/IfcLengthMeasure.js';

export interface IfcSlippageConnectionCondition extends IfcStructuralConnectionCondition {
  SlippageX?: IfcLengthMeasure | null;
  SlippageY?: IfcLengthMeasure | null;
  SlippageZ?: IfcLengthMeasure | null;
}
