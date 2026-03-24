import type { IfcFlowSegmentType } from './IfcFlowSegmentType.js';
import type { IfcConveyorSegmentTypeEnum } from '../enums/IfcConveyorSegmentTypeEnum.js';

export interface IfcConveyorSegmentType extends IfcFlowSegmentType {
  PredefinedType: IfcConveyorSegmentTypeEnum;
}
