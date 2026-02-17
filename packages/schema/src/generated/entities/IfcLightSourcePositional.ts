import type { IfcLightSource } from './IfcLightSource.js';
import type { IfcCartesianPoint } from './IfcCartesianPoint.js';
import type { IfcPositiveLengthMeasure } from '../types/IfcPositiveLengthMeasure.js';
import type { IfcReal } from '../types/IfcReal.js';

export interface IfcLightSourcePositional extends IfcLightSource {
  Position: IfcCartesianPoint;
  Radius: IfcPositiveLengthMeasure;
  ConstantAttenuation: IfcReal;
  DistanceAttenuation: IfcReal;
  QuadricAttenuation: IfcReal;
}
