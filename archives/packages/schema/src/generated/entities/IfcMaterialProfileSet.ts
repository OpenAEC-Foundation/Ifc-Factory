import type { IfcMaterialDefinition } from './IfcMaterialDefinition.js';
import type { IfcLabel } from '../types/IfcLabel.js';
import type { IfcText } from '../types/IfcText.js';
import type { IfcMaterialProfile } from './IfcMaterialProfile.js';
import type { IfcCompositeProfileDef } from './IfcCompositeProfileDef.js';

export interface IfcMaterialProfileSet extends IfcMaterialDefinition {
  Name?: IfcLabel | null;
  Description?: IfcText | null;
  MaterialProfiles: IfcMaterialProfile[];
  CompositeProfile?: IfcCompositeProfileDef | null;
}
