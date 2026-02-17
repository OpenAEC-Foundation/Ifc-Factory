import type { IfcRepresentationContext } from './IfcRepresentationContext.js';
import type { IfcDimensionCount } from '../types/IfcDimensionCount.js';
import type { IfcReal } from '../types/IfcReal.js';
import type { IfcAxis2Placement } from '../selects/IfcAxis2Placement.js';
import type { IfcDirection } from './IfcDirection.js';

export interface IfcGeometricRepresentationContext extends IfcRepresentationContext {
  CoordinateSpaceDimension: IfcDimensionCount;
  Precision?: IfcReal | null;
  WorldCoordinateSystem: IfcAxis2Placement;
  TrueNorth?: IfcDirection | null;
}
