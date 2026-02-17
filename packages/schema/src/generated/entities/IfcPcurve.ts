import type { IfcCurve } from './IfcCurve.js';
import type { IfcSurface } from './IfcSurface.js';

export interface IfcPcurve extends IfcCurve {
  BasisSurface: IfcSurface;
  ReferenceCurve: IfcCurve;
}
