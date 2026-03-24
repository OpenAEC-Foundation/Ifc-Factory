import type { IfcEdge } from './IfcEdge.js';
import type { IfcCurve } from './IfcCurve.js';
import type { IfcBoolean } from '../types/IfcBoolean.js';

export interface IfcEdgeCurve extends IfcEdge {
  EdgeGeometry: IfcCurve;
  SameSense: IfcBoolean;
}
