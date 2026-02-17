import type { IfcCurve } from './IfcCurve.js';

export interface IfcOffsetCurve extends IfcCurve {
  BasisCurve: IfcCurve;
}
