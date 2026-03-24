import type { IfcBoundedSurface } from './IfcBoundedSurface.js';
import type { IfcInteger } from '../types/IfcInteger.js';
import type { IfcCartesianPoint } from './IfcCartesianPoint.js';
import type { IfcBSplineSurfaceForm } from '../enums/IfcBSplineSurfaceForm.js';
import type { IfcLogical } from '../types/IfcLogical.js';

export interface IfcBSplineSurface extends IfcBoundedSurface {
  UDegree: IfcInteger;
  VDegree: IfcInteger;
  ControlPointsList: IfcCartesianPoint[][];
  SurfaceForm: IfcBSplineSurfaceForm;
  UClosed: IfcLogical;
  VClosed: IfcLogical;
  SelfIntersect: IfcLogical;
}
