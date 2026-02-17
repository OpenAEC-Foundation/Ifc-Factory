import type { IfcPreDefinedPropertySet } from './IfcPreDefinedPropertySet.js';
import type { IfcPositiveLengthMeasure } from '../types/IfcPositiveLengthMeasure.js';
import type { IfcNonNegativeLengthMeasure } from '../types/IfcNonNegativeLengthMeasure.js';
import type { IfcNormalisedRatioMeasure } from '../types/IfcNormalisedRatioMeasure.js';
import type { IfcShapeAspect } from './IfcShapeAspect.js';
import type { IfcLengthMeasure } from '../types/IfcLengthMeasure.js';

export interface IfcWindowLiningProperties extends IfcPreDefinedPropertySet {
  LiningDepth?: IfcPositiveLengthMeasure | null;
  LiningThickness?: IfcNonNegativeLengthMeasure | null;
  TransomThickness?: IfcNonNegativeLengthMeasure | null;
  MullionThickness?: IfcNonNegativeLengthMeasure | null;
  FirstTransomOffset?: IfcNormalisedRatioMeasure | null;
  SecondTransomOffset?: IfcNormalisedRatioMeasure | null;
  FirstMullionOffset?: IfcNormalisedRatioMeasure | null;
  SecondMullionOffset?: IfcNormalisedRatioMeasure | null;
  ShapeAspectStyle?: IfcShapeAspect | null;
  LiningOffset?: IfcLengthMeasure | null;
  LiningToPanelOffsetX?: IfcLengthMeasure | null;
  LiningToPanelOffsetY?: IfcLengthMeasure | null;
}
