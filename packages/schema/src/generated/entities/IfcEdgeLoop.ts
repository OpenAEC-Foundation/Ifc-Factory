import type { IfcLoop } from './IfcLoop.js';
import type { IfcOrientedEdge } from './IfcOrientedEdge.js';

export interface IfcEdgeLoop extends IfcLoop {
  EdgeList: IfcOrientedEdge[];
}
