import type { IfcMaterialDefinition } from './IfcMaterialDefinition.js';
import type { IfcLabel } from '../types/IfcLabel.js';
import type { IfcText } from '../types/IfcText.js';
import type { IfcMaterial } from './IfcMaterial.js';
import type { IfcNormalisedRatioMeasure } from '../types/IfcNormalisedRatioMeasure.js';

export interface IfcMaterialConstituent extends IfcMaterialDefinition {
  Name?: IfcLabel | null;
  Description?: IfcText | null;
  Material: IfcMaterial;
  Fraction?: IfcNormalisedRatioMeasure | null;
  Category?: IfcLabel | null;
}
