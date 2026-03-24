import type { IfcFacility } from './IfcFacility.js';
import type { IfcLengthMeasure } from '../types/IfcLengthMeasure.js';
import type { IfcPostalAddress } from './IfcPostalAddress.js';

export interface IfcBuilding extends IfcFacility {
  ElevationOfRefHeight?: IfcLengthMeasure | null;
  ElevationOfTerrain?: IfcLengthMeasure | null;
  BuildingAddress?: IfcPostalAddress | null;
}
