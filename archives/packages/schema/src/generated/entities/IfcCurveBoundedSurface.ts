import type { IfcBoundedSurface } from './IfcBoundedSurface.js';
import type { IfcSurface } from './IfcSurface.js';
import type { IfcBoundaryCurve } from './IfcBoundaryCurve.js';
import type { IfcBoolean } from '../types/IfcBoolean.js';

export interface IfcCurveBoundedSurface extends IfcBoundedSurface {
  BasisSurface: IfcSurface;
  Boundaries: IfcBoundaryCurve[];
  ImplicitOuter: IfcBoolean;
}
