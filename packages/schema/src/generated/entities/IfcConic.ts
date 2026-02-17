import type { IfcCurve } from './IfcCurve.js';
import type { IfcAxis2Placement } from '../selects/IfcAxis2Placement.js';

export interface IfcConic extends IfcCurve {
  Position: IfcAxis2Placement;
}
