import type { IfcSweptSurface } from './IfcSweptSurface.js';
import type { IfcDirection } from './IfcDirection.js';
import type { IfcLengthMeasure } from '../types/IfcLengthMeasure.js';

export interface IfcSurfaceOfLinearExtrusion extends IfcSweptSurface {
  ExtrudedDirection: IfcDirection;
  Depth: IfcLengthMeasure;
}
