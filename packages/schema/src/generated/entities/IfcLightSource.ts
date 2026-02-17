import type { IfcGeometricRepresentationItem } from './IfcGeometricRepresentationItem.js';
import type { IfcLabel } from '../types/IfcLabel.js';
import type { IfcColourRgb } from './IfcColourRgb.js';
import type { IfcNormalisedRatioMeasure } from '../types/IfcNormalisedRatioMeasure.js';

export interface IfcLightSource extends IfcGeometricRepresentationItem {
  Name?: IfcLabel | null;
  LightColour: IfcColourRgb;
  AmbientIntensity?: IfcNormalisedRatioMeasure | null;
  Intensity?: IfcNormalisedRatioMeasure | null;
}
