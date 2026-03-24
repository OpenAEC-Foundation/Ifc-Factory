import type { IfcFlowSegment } from './IfcFlowSegment.js';
import type { IfcConveyorSegmentTypeEnum } from '../enums/IfcConveyorSegmentTypeEnum.js';

export interface IfcConveyorSegment extends IfcFlowSegment {
  PredefinedType?: IfcConveyorSegmentTypeEnum | null;
}
