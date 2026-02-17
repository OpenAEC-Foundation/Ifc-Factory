import type { IfcCompositeCurveOnSurface } from '../entities/IfcCompositeCurveOnSurface.js';
import type { IfcPcurve } from '../entities/IfcPcurve.js';
import type { IfcSurfaceCurve } from '../entities/IfcSurfaceCurve.js';

export type IfcCurveOnSurface = IfcCompositeCurveOnSurface | IfcPcurve | IfcSurfaceCurve;
