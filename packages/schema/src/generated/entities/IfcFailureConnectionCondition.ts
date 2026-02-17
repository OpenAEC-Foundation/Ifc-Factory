import type { IfcStructuralConnectionCondition } from './IfcStructuralConnectionCondition.js';
import type { IfcForceMeasure } from '../types/IfcForceMeasure.js';

export interface IfcFailureConnectionCondition extends IfcStructuralConnectionCondition {
  TensionFailureX?: IfcForceMeasure | null;
  TensionFailureY?: IfcForceMeasure | null;
  TensionFailureZ?: IfcForceMeasure | null;
  CompressionFailureX?: IfcForceMeasure | null;
  CompressionFailureY?: IfcForceMeasure | null;
  CompressionFailureZ?: IfcForceMeasure | null;
}
