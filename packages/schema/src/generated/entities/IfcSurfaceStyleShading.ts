import type { IfcPresentationItem } from './IfcPresentationItem.js';
import type { IfcColourRgb } from './IfcColourRgb.js';
import type { IfcNormalisedRatioMeasure } from '../types/IfcNormalisedRatioMeasure.js';

export interface IfcSurfaceStyleShading extends IfcPresentationItem {
  SurfaceColour: IfcColourRgb;
  Transparency?: IfcNormalisedRatioMeasure | null;
}
