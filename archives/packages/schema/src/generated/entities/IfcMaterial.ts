import type { IfcMaterialDefinition } from './IfcMaterialDefinition.js';
import type { IfcLabel } from '../types/IfcLabel.js';
import type { IfcText } from '../types/IfcText.js';

export interface IfcMaterial extends IfcMaterialDefinition {
  Name: IfcLabel;
  Description?: IfcText | null;
  Category?: IfcLabel | null;
}
