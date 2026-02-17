import type { IfcMaterialProfile } from './IfcMaterialProfile.js';
import type { IfcLengthMeasure } from '../types/IfcLengthMeasure.js';

export interface IfcMaterialProfileWithOffsets extends IfcMaterialProfile {
  OffsetValues: IfcLengthMeasure[];
}
