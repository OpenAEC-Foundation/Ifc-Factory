import type { IfcDirectrixCurveSweptAreaSolid } from './IfcDirectrixCurveSweptAreaSolid.js';
import type { IfcDirection } from './IfcDirection.js';

export interface IfcFixedReferenceSweptAreaSolid extends IfcDirectrixCurveSweptAreaSolid {
  FixedReference: IfcDirection;
}
