import type { IfcPreDefinedPropertySet } from './IfcPreDefinedPropertySet.js';
import type { IfcPermeableCoveringOperationEnum } from '../enums/IfcPermeableCoveringOperationEnum.js';
import type { IfcWindowPanelPositionEnum } from '../enums/IfcWindowPanelPositionEnum.js';
import type { IfcPositiveLengthMeasure } from '../types/IfcPositiveLengthMeasure.js';
import type { IfcShapeAspect } from './IfcShapeAspect.js';

export interface IfcPermeableCoveringProperties extends IfcPreDefinedPropertySet {
  OperationType: IfcPermeableCoveringOperationEnum;
  PanelPosition: IfcWindowPanelPositionEnum;
  FrameDepth?: IfcPositiveLengthMeasure | null;
  FrameThickness?: IfcPositiveLengthMeasure | null;
  ShapeAspectStyle?: IfcShapeAspect | null;
}
