import type { IfcGeometricRepresentationItem } from './IfcGeometricRepresentationItem.js';
import type { IfcSurface } from './IfcSurface.js';
import type { IfcBoolean } from '../types/IfcBoolean.js';

export interface IfcHalfSpaceSolid extends IfcGeometricRepresentationItem {
  BaseSurface: IfcSurface;
  AgreementFlag: IfcBoolean;
}
