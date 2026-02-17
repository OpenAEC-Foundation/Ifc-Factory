import type { IfcStructuralLoadGroup } from './IfcStructuralLoadGroup.js';
import type { IfcRatioMeasure } from '../types/IfcRatioMeasure.js';

export interface IfcStructuralLoadCase extends IfcStructuralLoadGroup {
  SelfWeightCoefficients?: IfcRatioMeasure[] | null;
}
