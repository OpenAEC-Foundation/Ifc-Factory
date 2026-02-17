import type { IfcCoordinateReferenceSystem } from './IfcCoordinateReferenceSystem.js';
import type { IfcIdentifier } from '../types/IfcIdentifier.js';
import type { IfcNamedUnit } from './IfcNamedUnit.js';

export interface IfcGeographicCRS extends IfcCoordinateReferenceSystem {
  PrimeMeridian?: IfcIdentifier | null;
  AngleUnit?: IfcNamedUnit | null;
  HeightUnit?: IfcNamedUnit | null;
}
