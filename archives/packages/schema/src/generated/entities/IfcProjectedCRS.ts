import type { IfcCoordinateReferenceSystem } from './IfcCoordinateReferenceSystem.js';
import type { IfcIdentifier } from '../types/IfcIdentifier.js';
import type { IfcNamedUnit } from './IfcNamedUnit.js';

export interface IfcProjectedCRS extends IfcCoordinateReferenceSystem {
  VerticalDatum?: IfcIdentifier | null;
  MapProjection?: IfcIdentifier | null;
  MapZone?: IfcIdentifier | null;
  MapUnit?: IfcNamedUnit | null;
}
