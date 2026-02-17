import type { IfcCoordinateOperation } from './IfcCoordinateOperation.js';
import type { IfcMeasureValue } from '../selects/IfcMeasureValue.js';
import type { IfcLengthMeasure } from '../types/IfcLengthMeasure.js';

export interface IfcRigidOperation extends IfcCoordinateOperation {
  FirstCoordinate: IfcMeasureValue;
  SecondCoordinate: IfcMeasureValue;
  Height?: IfcLengthMeasure | null;
}
