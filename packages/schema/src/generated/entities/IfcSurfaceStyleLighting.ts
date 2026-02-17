import type { IfcPresentationItem } from './IfcPresentationItem.js';
import type { IfcColourRgb } from './IfcColourRgb.js';

export interface IfcSurfaceStyleLighting extends IfcPresentationItem {
  DiffuseTransmissionColour: IfcColourRgb;
  DiffuseReflectionColour: IfcColourRgb;
  TransmissionColour: IfcColourRgb;
  ReflectanceColour: IfcColourRgb;
}
