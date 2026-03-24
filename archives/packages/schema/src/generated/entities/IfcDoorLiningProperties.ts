import type { IfcPreDefinedPropertySet } from './IfcPreDefinedPropertySet.js';
import type { IfcPositiveLengthMeasure } from '../types/IfcPositiveLengthMeasure.js';
import type { IfcNonNegativeLengthMeasure } from '../types/IfcNonNegativeLengthMeasure.js';
import type { IfcLengthMeasure } from '../types/IfcLengthMeasure.js';
import type { IfcShapeAspect } from './IfcShapeAspect.js';

export interface IfcDoorLiningProperties extends IfcPreDefinedPropertySet {
  LiningDepth?: IfcPositiveLengthMeasure | null;
  LiningThickness?: IfcNonNegativeLengthMeasure | null;
  ThresholdDepth?: IfcPositiveLengthMeasure | null;
  ThresholdThickness?: IfcNonNegativeLengthMeasure | null;
  TransomThickness?: IfcNonNegativeLengthMeasure | null;
  TransomOffset?: IfcLengthMeasure | null;
  LiningOffset?: IfcLengthMeasure | null;
  ThresholdOffset?: IfcLengthMeasure | null;
  CasingThickness?: IfcPositiveLengthMeasure | null;
  CasingDepth?: IfcPositiveLengthMeasure | null;
  ShapeAspectStyle?: IfcShapeAspect | null;
  LiningToPanelOffsetX?: IfcLengthMeasure | null;
  LiningToPanelOffsetY?: IfcLengthMeasure | null;
}
