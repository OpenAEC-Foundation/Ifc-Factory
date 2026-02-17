import type { IfcGeometricRepresentationItem } from './IfcGeometricRepresentationItem.js';
import type { IfcShell } from '../selects/IfcShell.js';

export interface IfcShellBasedSurfaceModel extends IfcGeometricRepresentationItem {
  SbsmBoundary: IfcShell[];
}
