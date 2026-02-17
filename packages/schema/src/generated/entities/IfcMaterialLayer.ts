import type { IfcMaterialDefinition } from './IfcMaterialDefinition.js';
import type { IfcMaterial } from './IfcMaterial.js';
import type { IfcNonNegativeLengthMeasure } from '../types/IfcNonNegativeLengthMeasure.js';
import type { IfcLogical } from '../types/IfcLogical.js';
import type { IfcLabel } from '../types/IfcLabel.js';
import type { IfcText } from '../types/IfcText.js';
import type { IfcInteger } from '../types/IfcInteger.js';

export interface IfcMaterialLayer extends IfcMaterialDefinition {
  Material?: IfcMaterial | null;
  LayerThickness: IfcNonNegativeLengthMeasure;
  IsVentilated?: IfcLogical | null;
  Name?: IfcLabel | null;
  Description?: IfcText | null;
  Category?: IfcLabel | null;
  Priority?: IfcInteger | null;
}
