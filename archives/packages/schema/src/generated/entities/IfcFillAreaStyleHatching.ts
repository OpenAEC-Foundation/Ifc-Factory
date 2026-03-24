import type { IfcGeometricRepresentationItem } from './IfcGeometricRepresentationItem.js';
import type { IfcCurveStyle } from './IfcCurveStyle.js';
import type { IfcHatchLineDistanceSelect } from '../selects/IfcHatchLineDistanceSelect.js';
import type { IfcCartesianPoint } from './IfcCartesianPoint.js';
import type { IfcPlaneAngleMeasure } from '../types/IfcPlaneAngleMeasure.js';

export interface IfcFillAreaStyleHatching extends IfcGeometricRepresentationItem {
  HatchLineAppearance: IfcCurveStyle;
  StartOfNextHatchLine: IfcHatchLineDistanceSelect;
  PointOfReferenceHatchLine?: IfcCartesianPoint | null;
  PatternStart?: IfcCartesianPoint | null;
  HatchLineAngle: IfcPlaneAngleMeasure;
}
