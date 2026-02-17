import type { IfcSpiral } from './IfcSpiral.js';
import type { IfcLengthMeasure } from '../types/IfcLengthMeasure.js';

export interface IfcClothoid extends IfcSpiral {
  ClothoidConstant: IfcLengthMeasure;
}
