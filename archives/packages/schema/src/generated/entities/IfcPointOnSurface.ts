import type { IfcPoint } from './IfcPoint.js';
import type { IfcSurface } from './IfcSurface.js';
import type { IfcParameterValue } from '../types/IfcParameterValue.js';

export interface IfcPointOnSurface extends IfcPoint {
  BasisSurface: IfcSurface;
  PointParameterU: IfcParameterValue;
  PointParameterV: IfcParameterValue;
}
