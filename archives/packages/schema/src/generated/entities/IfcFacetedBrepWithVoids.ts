import type { IfcFacetedBrep } from './IfcFacetedBrep.js';
import type { IfcClosedShell } from './IfcClosedShell.js';

export interface IfcFacetedBrepWithVoids extends IfcFacetedBrep {
  Voids: IfcClosedShell[];
}
