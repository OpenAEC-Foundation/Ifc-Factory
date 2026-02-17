import type { IfcTopologicalRepresentationItem } from './IfcTopologicalRepresentationItem.js';
import type { IfcFace } from './IfcFace.js';

export interface IfcConnectedFaceSet extends IfcTopologicalRepresentationItem {
  CfsFaces: IfcFace[];
}
