import type { IfcRelSpaceBoundary } from './IfcRelSpaceBoundary.js';

export interface IfcRelSpaceBoundary1stLevel extends IfcRelSpaceBoundary {
  ParentBoundary?: IfcRelSpaceBoundary1stLevel | null;
}
