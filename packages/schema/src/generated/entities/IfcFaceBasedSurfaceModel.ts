import type { IfcGeometricRepresentationItem } from './IfcGeometricRepresentationItem.js';
import type { IfcConnectedFaceSet } from './IfcConnectedFaceSet.js';

export interface IfcFaceBasedSurfaceModel extends IfcGeometricRepresentationItem {
  FbsmFaces: IfcConnectedFaceSet[];
}
