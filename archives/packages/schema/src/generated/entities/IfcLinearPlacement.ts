import type { IfcObjectPlacement } from './IfcObjectPlacement.js';
import type { IfcAxis2PlacementLinear } from './IfcAxis2PlacementLinear.js';
import type { IfcAxis2Placement3D } from './IfcAxis2Placement3D.js';

export interface IfcLinearPlacement extends IfcObjectPlacement {
  RelativePlacement: IfcAxis2PlacementLinear;
  CartesianPosition?: IfcAxis2Placement3D | null;
}
