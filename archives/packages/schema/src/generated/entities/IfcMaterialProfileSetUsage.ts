import type { IfcMaterialUsageDefinition } from './IfcMaterialUsageDefinition.js';
import type { IfcMaterialProfileSet } from './IfcMaterialProfileSet.js';
import type { IfcCardinalPointReference } from '../types/IfcCardinalPointReference.js';
import type { IfcPositiveLengthMeasure } from '../types/IfcPositiveLengthMeasure.js';

export interface IfcMaterialProfileSetUsage extends IfcMaterialUsageDefinition {
  ForProfileSet: IfcMaterialProfileSet;
  CardinalPoint?: IfcCardinalPointReference | null;
  ReferenceExtent?: IfcPositiveLengthMeasure | null;
}
