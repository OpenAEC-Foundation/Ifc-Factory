import type { IfcTopologicalRepresentationItem } from './IfcTopologicalRepresentationItem.js';
import type { IfcVertex } from './IfcVertex.js';

export interface IfcEdge extends IfcTopologicalRepresentationItem {
  EdgeStart: IfcVertex;
  EdgeEnd: IfcVertex;
}
