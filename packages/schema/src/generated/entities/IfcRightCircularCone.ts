import type { IfcCsgPrimitive3D } from './IfcCsgPrimitive3D.js';
import type { IfcPositiveLengthMeasure } from '../types/IfcPositiveLengthMeasure.js';

export interface IfcRightCircularCone extends IfcCsgPrimitive3D {
  Height: IfcPositiveLengthMeasure;
  BottomRadius: IfcPositiveLengthMeasure;
}
