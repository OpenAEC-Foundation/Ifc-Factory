import type { IfcCartesianPointList } from './IfcCartesianPointList.js';
import type { IfcLengthMeasure } from '../types/IfcLengthMeasure.js';
import type { IfcLabel } from '../types/IfcLabel.js';

export interface IfcCartesianPointList2D extends IfcCartesianPointList {
  CoordList: IfcLengthMeasure[][];
  TagList?: IfcLabel[] | null;
}
