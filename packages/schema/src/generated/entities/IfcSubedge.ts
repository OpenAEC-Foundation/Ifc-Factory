import type { IfcEdge } from './IfcEdge.js';

export interface IfcSubedge extends IfcEdge {
  ParentEdge: IfcEdge;
}
