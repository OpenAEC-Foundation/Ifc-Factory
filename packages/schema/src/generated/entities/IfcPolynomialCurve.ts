import type { IfcCurve } from './IfcCurve.js';
import type { IfcPlacement } from './IfcPlacement.js';
import type { IfcReal } from '../types/IfcReal.js';

export interface IfcPolynomialCurve extends IfcCurve {
  Position: IfcPlacement;
  CoefficientsX?: IfcReal[] | null;
  CoefficientsY?: IfcReal[] | null;
  CoefficientsZ?: IfcReal[] | null;
}
