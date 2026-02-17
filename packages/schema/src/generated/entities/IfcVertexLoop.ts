import type { IfcLoop } from './IfcLoop.js';
import type { IfcVertex } from './IfcVertex.js';

export interface IfcVertexLoop extends IfcLoop {
  LoopVertex: IfcVertex;
}
