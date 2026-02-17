import type { IfcGeometricRepresentationItem } from './IfcGeometricRepresentationItem.js';
import type { IfcCartesianPoint } from './IfcCartesianPoint.js';
import type { IfcPositiveLengthMeasure } from '../types/IfcPositiveLengthMeasure.js';

export interface IfcBoundingBox extends IfcGeometricRepresentationItem {
  Corner: IfcCartesianPoint;
  XDim: IfcPositiveLengthMeasure;
  YDim: IfcPositiveLengthMeasure;
  ZDim: IfcPositiveLengthMeasure;
}
