import type { IfcCsgPrimitive3D } from './IfcCsgPrimitive3D.js';
import type { IfcPositiveLengthMeasure } from '../types/IfcPositiveLengthMeasure.js';

export interface IfcSphere extends IfcCsgPrimitive3D {
  Radius: IfcPositiveLengthMeasure;
}
