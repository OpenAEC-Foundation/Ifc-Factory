import type { IfcMaterialProfileSetUsage } from './IfcMaterialProfileSetUsage.js';
import type { IfcMaterialProfileSet } from './IfcMaterialProfileSet.js';
import type { IfcCardinalPointReference } from '../types/IfcCardinalPointReference.js';

export interface IfcMaterialProfileSetUsageTapering extends IfcMaterialProfileSetUsage {
  ForProfileEndSet: IfcMaterialProfileSet;
  CardinalEndPoint?: IfcCardinalPointReference | null;
}
