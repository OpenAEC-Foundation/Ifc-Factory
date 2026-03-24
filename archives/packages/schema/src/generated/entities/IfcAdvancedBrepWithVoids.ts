import type { IfcAdvancedBrep } from './IfcAdvancedBrep.js';
import type { IfcClosedShell } from './IfcClosedShell.js';

export interface IfcAdvancedBrepWithVoids extends IfcAdvancedBrep {
  Voids: IfcClosedShell[];
}
