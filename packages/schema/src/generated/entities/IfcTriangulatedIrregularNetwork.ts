import type { IfcTriangulatedFaceSet } from './IfcTriangulatedFaceSet.js';
import type { IfcInteger } from '../types/IfcInteger.js';

export interface IfcTriangulatedIrregularNetwork extends IfcTriangulatedFaceSet {
  Flags: IfcInteger[];
}
