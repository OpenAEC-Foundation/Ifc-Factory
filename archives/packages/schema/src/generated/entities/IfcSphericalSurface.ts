import type { IfcElementarySurface } from './IfcElementarySurface.js';
import type { IfcPositiveLengthMeasure } from '../types/IfcPositiveLengthMeasure.js';

export interface IfcSphericalSurface extends IfcElementarySurface {
  Radius: IfcPositiveLengthMeasure;
}
