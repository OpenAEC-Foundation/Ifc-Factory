import type { IfcHalfSpaceSolid } from './IfcHalfSpaceSolid.js';
import type { IfcBoundingBox } from './IfcBoundingBox.js';

export interface IfcBoxedHalfSpace extends IfcHalfSpaceSolid {
  Enclosure: IfcBoundingBox;
}
