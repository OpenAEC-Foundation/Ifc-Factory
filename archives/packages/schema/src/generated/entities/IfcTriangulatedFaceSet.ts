import type { IfcTessellatedFaceSet } from './IfcTessellatedFaceSet.js';
import type { IfcParameterValue } from '../types/IfcParameterValue.js';
import type { IfcBoolean } from '../types/IfcBoolean.js';
import type { IfcPositiveInteger } from '../types/IfcPositiveInteger.js';

export interface IfcTriangulatedFaceSet extends IfcTessellatedFaceSet {
  Normals?: IfcParameterValue[][] | null;
  Closed?: IfcBoolean | null;
  CoordIndex: IfcPositiveInteger[][];
  PnIndex?: IfcPositiveInteger[] | null;
}
