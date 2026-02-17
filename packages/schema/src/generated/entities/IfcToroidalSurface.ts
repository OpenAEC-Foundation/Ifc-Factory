import type { IfcElementarySurface } from './IfcElementarySurface.js';
import type { IfcPositiveLengthMeasure } from '../types/IfcPositiveLengthMeasure.js';

export interface IfcToroidalSurface extends IfcElementarySurface {
  MajorRadius: IfcPositiveLengthMeasure;
  MinorRadius: IfcPositiveLengthMeasure;
}
