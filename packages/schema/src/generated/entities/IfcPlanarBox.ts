import type { IfcPlanarExtent } from './IfcPlanarExtent.js';
import type { IfcAxis2Placement } from '../selects/IfcAxis2Placement.js';

export interface IfcPlanarBox extends IfcPlanarExtent {
  Placement: IfcAxis2Placement;
}
