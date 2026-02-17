import type { IfcMaterialDefinition } from './IfcMaterialDefinition.js';
import type { IfcLabel } from '../types/IfcLabel.js';
import type { IfcText } from '../types/IfcText.js';
import type { IfcMaterial } from './IfcMaterial.js';
import type { IfcProfileDef } from './IfcProfileDef.js';
import type { IfcInteger } from '../types/IfcInteger.js';

export interface IfcMaterialProfile extends IfcMaterialDefinition {
  Name?: IfcLabel | null;
  Description?: IfcText | null;
  Material?: IfcMaterial | null;
  Profile: IfcProfileDef;
  Priority?: IfcInteger | null;
  Category?: IfcLabel | null;
}
