import type { IfcPreDefinedPropertySet } from './IfcPreDefinedPropertySet.js';
import type { IfcWindowPanelOperationEnum } from '../enums/IfcWindowPanelOperationEnum.js';
import type { IfcWindowPanelPositionEnum } from '../enums/IfcWindowPanelPositionEnum.js';
import type { IfcPositiveLengthMeasure } from '../types/IfcPositiveLengthMeasure.js';
import type { IfcShapeAspect } from './IfcShapeAspect.js';

export interface IfcWindowPanelProperties extends IfcPreDefinedPropertySet {
  OperationType: IfcWindowPanelOperationEnum;
  PanelPosition: IfcWindowPanelPositionEnum;
  FrameDepth?: IfcPositiveLengthMeasure | null;
  FrameThickness?: IfcPositiveLengthMeasure | null;
  ShapeAspectStyle?: IfcShapeAspect | null;
}
