import type { IfcStructuralLoad } from './IfcStructuralLoad.js';
import type { IfcStructuralLoadOrResult } from './IfcStructuralLoadOrResult.js';
import type { IfcLengthMeasure } from '../types/IfcLengthMeasure.js';

export interface IfcStructuralLoadConfiguration extends IfcStructuralLoad {
  Values: IfcStructuralLoadOrResult[];
  Locations?: IfcLengthMeasure[][] | null;
}
