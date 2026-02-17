import type { IfcBoundedCurve } from './IfcBoundedCurve.js';
import type { IfcInteger } from '../types/IfcInteger.js';
import type { IfcCartesianPoint } from './IfcCartesianPoint.js';
import type { IfcBSplineCurveForm } from '../enums/IfcBSplineCurveForm.js';
import type { IfcLogical } from '../types/IfcLogical.js';

export interface IfcBSplineCurve extends IfcBoundedCurve {
  Degree: IfcInteger;
  ControlPointsList: IfcCartesianPoint[];
  CurveForm: IfcBSplineCurveForm;
  ClosedCurve: IfcLogical;
  SelfIntersect: IfcLogical;
}
