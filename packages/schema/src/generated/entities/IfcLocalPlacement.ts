import type { IfcObjectPlacement } from './IfcObjectPlacement.js';
import type { IfcAxis2Placement } from '../selects/IfcAxis2Placement.js';

export interface IfcLocalPlacement extends IfcObjectPlacement {
  RelativePlacement: IfcAxis2Placement;
}
