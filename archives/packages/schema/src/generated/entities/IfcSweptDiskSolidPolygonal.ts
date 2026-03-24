import type { IfcSweptDiskSolid } from './IfcSweptDiskSolid.js';
import type { IfcNonNegativeLengthMeasure } from '../types/IfcNonNegativeLengthMeasure.js';

export interface IfcSweptDiskSolidPolygonal extends IfcSweptDiskSolid {
  FilletRadius?: IfcNonNegativeLengthMeasure | null;
}
