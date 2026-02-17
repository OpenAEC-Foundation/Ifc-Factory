import type { IfcRelDecomposes } from './IfcRelDecomposes.js';
import type { IfcElement } from './IfcElement.js';
import type { IfcSurfaceFeature } from './IfcSurfaceFeature.js';

export interface IfcRelAdheresToElement extends IfcRelDecomposes {
  RelatingElement: IfcElement;
  RelatedSurfaceFeatures: IfcSurfaceFeature[];
}
