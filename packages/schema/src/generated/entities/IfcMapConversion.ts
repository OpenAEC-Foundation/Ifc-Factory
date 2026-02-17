import type { IfcCoordinateOperation } from './IfcCoordinateOperation.js';
import type { IfcLengthMeasure } from '../types/IfcLengthMeasure.js';
import type { IfcReal } from '../types/IfcReal.js';

export interface IfcMapConversion extends IfcCoordinateOperation {
  Eastings: IfcLengthMeasure;
  Northings: IfcLengthMeasure;
  OrthogonalHeight: IfcLengthMeasure;
  XAxisAbscissa?: IfcReal | null;
  XAxisOrdinate?: IfcReal | null;
  Scale?: IfcReal | null;
}
