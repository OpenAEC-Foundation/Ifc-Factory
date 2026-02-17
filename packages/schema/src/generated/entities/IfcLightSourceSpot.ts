import type { IfcLightSourcePositional } from './IfcLightSourcePositional.js';
import type { IfcDirection } from './IfcDirection.js';
import type { IfcReal } from '../types/IfcReal.js';
import type { IfcPositivePlaneAngleMeasure } from '../types/IfcPositivePlaneAngleMeasure.js';

export interface IfcLightSourceSpot extends IfcLightSourcePositional {
  Orientation: IfcDirection;
  ConcentrationExponent?: IfcReal | null;
  SpreadAngle: IfcPositivePlaneAngleMeasure;
  BeamWidthAngle: IfcPositivePlaneAngleMeasure;
}
