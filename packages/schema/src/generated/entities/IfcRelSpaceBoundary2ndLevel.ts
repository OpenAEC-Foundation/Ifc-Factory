import type { IfcRelSpaceBoundary1stLevel } from './IfcRelSpaceBoundary1stLevel.js';

export interface IfcRelSpaceBoundary2ndLevel extends IfcRelSpaceBoundary1stLevel {
  CorrespondingBoundary?: IfcRelSpaceBoundary2ndLevel | null;
}
