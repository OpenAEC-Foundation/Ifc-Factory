import type { IfcPreDefinedPropertySet } from './IfcPreDefinedPropertySet.js';
import type { IfcPositiveLengthMeasure } from '../types/IfcPositiveLengthMeasure.js';
import type { IfcDoorPanelOperationEnum } from '../enums/IfcDoorPanelOperationEnum.js';
import type { IfcNormalisedRatioMeasure } from '../types/IfcNormalisedRatioMeasure.js';
import type { IfcDoorPanelPositionEnum } from '../enums/IfcDoorPanelPositionEnum.js';
import type { IfcShapeAspect } from './IfcShapeAspect.js';

export interface IfcDoorPanelProperties extends IfcPreDefinedPropertySet {
  PanelDepth?: IfcPositiveLengthMeasure | null;
  PanelOperation: IfcDoorPanelOperationEnum;
  PanelWidth?: IfcNormalisedRatioMeasure | null;
  PanelPosition: IfcDoorPanelPositionEnum;
  ShapeAspectStyle?: IfcShapeAspect | null;
}
