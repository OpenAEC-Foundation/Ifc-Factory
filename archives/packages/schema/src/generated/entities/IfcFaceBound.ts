import type { IfcTopologicalRepresentationItem } from './IfcTopologicalRepresentationItem.js';
import type { IfcLoop } from './IfcLoop.js';
import type { IfcBoolean } from '../types/IfcBoolean.js';

export interface IfcFaceBound extends IfcTopologicalRepresentationItem {
  Bound: IfcLoop;
  Orientation: IfcBoolean;
}
