import type { IfcConnectionGeometry } from './IfcConnectionGeometry.js';
import type { IfcSolidOrShell } from '../selects/IfcSolidOrShell.js';

export interface IfcConnectionVolumeGeometry extends IfcConnectionGeometry {
  VolumeOnRelatingElement: IfcSolidOrShell;
  VolumeOnRelatedElement?: IfcSolidOrShell | null;
}
