import type { IfcCsgPrimitive3D } from './IfcCsgPrimitive3D.js';
import type { IfcPositiveLengthMeasure } from '../types/IfcPositiveLengthMeasure.js';

export interface IfcBlock extends IfcCsgPrimitive3D {
  XLength: IfcPositiveLengthMeasure;
  YLength: IfcPositiveLengthMeasure;
  ZLength: IfcPositiveLengthMeasure;
}
