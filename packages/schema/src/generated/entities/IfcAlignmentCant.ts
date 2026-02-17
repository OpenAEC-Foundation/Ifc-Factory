import type { IfcLinearElement } from './IfcLinearElement.js';
import type { IfcPositiveLengthMeasure } from '../types/IfcPositiveLengthMeasure.js';

export interface IfcAlignmentCant extends IfcLinearElement {
  RailHeadDistance: IfcPositiveLengthMeasure;
}
