import type { IfcDirectrixCurveSweptAreaSolid } from './IfcDirectrixCurveSweptAreaSolid.js';
import type { IfcSurface } from './IfcSurface.js';

export interface IfcSurfaceCurveSweptAreaSolid extends IfcDirectrixCurveSweptAreaSolid {
  ReferenceSurface: IfcSurface;
}
