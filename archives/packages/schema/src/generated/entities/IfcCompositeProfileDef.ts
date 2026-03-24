import type { IfcProfileDef } from './IfcProfileDef.js';
import type { IfcLabel } from '../types/IfcLabel.js';

export interface IfcCompositeProfileDef extends IfcProfileDef {
  Profiles: IfcProfileDef[];
  Label?: IfcLabel | null;
}
