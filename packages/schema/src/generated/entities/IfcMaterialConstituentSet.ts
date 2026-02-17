import type { IfcMaterialDefinition } from './IfcMaterialDefinition.js';
import type { IfcLabel } from '../types/IfcLabel.js';
import type { IfcText } from '../types/IfcText.js';
import type { IfcMaterialConstituent } from './IfcMaterialConstituent.js';

export interface IfcMaterialConstituentSet extends IfcMaterialDefinition {
  Name?: IfcLabel | null;
  Description?: IfcText | null;
  MaterialConstituents?: IfcMaterialConstituent[] | null;
}
