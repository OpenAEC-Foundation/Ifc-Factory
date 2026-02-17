import type { IfcTopologicalRepresentationItem } from './IfcTopologicalRepresentationItem.js';
import type { IfcOrientedEdge } from './IfcOrientedEdge.js';

export interface IfcPath extends IfcTopologicalRepresentationItem {
  EdgeList: IfcOrientedEdge[];
}
