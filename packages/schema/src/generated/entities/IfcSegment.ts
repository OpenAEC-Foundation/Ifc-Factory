import type { IfcGeometricRepresentationItem } from './IfcGeometricRepresentationItem.js';
import type { IfcTransitionCode } from '../enums/IfcTransitionCode.js';

export interface IfcSegment extends IfcGeometricRepresentationItem {
  Transition: IfcTransitionCode;
}
