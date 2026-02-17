import type { IfcSweptAreaSolid } from './IfcSweptAreaSolid.js';
import type { IfcDirection } from './IfcDirection.js';
import type { IfcPositiveLengthMeasure } from '../types/IfcPositiveLengthMeasure.js';

export interface IfcExtrudedAreaSolid extends IfcSweptAreaSolid {
  ExtrudedDirection: IfcDirection;
  Depth: IfcPositiveLengthMeasure;
}
