import type { IfcBoundedCurve } from './IfcBoundedCurve.js';
import type { IfcCartesianPointList } from './IfcCartesianPointList.js';
import type { IfcSegmentIndexSelect } from '../selects/IfcSegmentIndexSelect.js';
import type { IfcBoolean } from '../types/IfcBoolean.js';

export interface IfcIndexedPolyCurve extends IfcBoundedCurve {
  Points: IfcCartesianPointList;
  Segments?: IfcSegmentIndexSelect[] | null;
  SelfIntersect?: IfcBoolean | null;
}
