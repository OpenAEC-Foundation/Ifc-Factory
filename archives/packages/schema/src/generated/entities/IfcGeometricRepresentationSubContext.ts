import type { IfcGeometricRepresentationContext } from './IfcGeometricRepresentationContext.js';
import type { IfcPositiveRatioMeasure } from '../types/IfcPositiveRatioMeasure.js';
import type { IfcGeometricProjectionEnum } from '../enums/IfcGeometricProjectionEnum.js';
import type { IfcLabel } from '../types/IfcLabel.js';

export interface IfcGeometricRepresentationSubContext extends IfcGeometricRepresentationContext {
  ParentContext: IfcGeometricRepresentationContext;
  TargetScale?: IfcPositiveRatioMeasure | null;
  TargetView: IfcGeometricProjectionEnum;
  UserDefinedTargetView?: IfcLabel | null;
}
