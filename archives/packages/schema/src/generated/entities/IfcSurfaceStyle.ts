import type { IfcPresentationStyle } from './IfcPresentationStyle.js';
import type { IfcSurfaceSide } from '../enums/IfcSurfaceSide.js';
import type { IfcSurfaceStyleElementSelect } from '../selects/IfcSurfaceStyleElementSelect.js';

export interface IfcSurfaceStyle extends IfcPresentationStyle {
  Side: IfcSurfaceSide;
  Styles: IfcSurfaceStyleElementSelect[];
}
