import type { IfcEdge } from './IfcEdge.js';
import type { IfcBoolean } from '../types/IfcBoolean.js';

export interface IfcOrientedEdge extends IfcEdge {
  EdgeElement: IfcEdge;
  Orientation: IfcBoolean;
}
