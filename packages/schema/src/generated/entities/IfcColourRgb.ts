import type { IfcColourSpecification } from './IfcColourSpecification.js';
import type { IfcNormalisedRatioMeasure } from '../types/IfcNormalisedRatioMeasure.js';

export interface IfcColourRgb extends IfcColourSpecification {
  Red: IfcNormalisedRatioMeasure;
  Green: IfcNormalisedRatioMeasure;
  Blue: IfcNormalisedRatioMeasure;
}
