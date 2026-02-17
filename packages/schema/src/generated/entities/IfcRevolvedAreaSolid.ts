import type { IfcSweptAreaSolid } from './IfcSweptAreaSolid.js';
import type { IfcAxis1Placement } from './IfcAxis1Placement.js';
import type { IfcPlaneAngleMeasure } from '../types/IfcPlaneAngleMeasure.js';

export interface IfcRevolvedAreaSolid extends IfcSweptAreaSolid {
  Axis: IfcAxis1Placement;
  Angle: IfcPlaneAngleMeasure;
}
