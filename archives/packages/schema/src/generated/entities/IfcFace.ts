import type { IfcTopologicalRepresentationItem } from './IfcTopologicalRepresentationItem.js';
import type { IfcFaceBound } from './IfcFaceBound.js';

export interface IfcFace extends IfcTopologicalRepresentationItem {
  Bounds: IfcFaceBound[];
}
