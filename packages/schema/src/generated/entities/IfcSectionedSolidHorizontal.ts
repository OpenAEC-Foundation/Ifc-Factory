import type { IfcSectionedSolid } from './IfcSectionedSolid.js';
import type { IfcAxis2PlacementLinear } from './IfcAxis2PlacementLinear.js';

export interface IfcSectionedSolidHorizontal extends IfcSectionedSolid {
  CrossSectionPositions: IfcAxis2PlacementLinear[];
}
