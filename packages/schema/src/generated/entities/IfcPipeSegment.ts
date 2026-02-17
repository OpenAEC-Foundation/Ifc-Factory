import type { IfcFlowSegment } from './IfcFlowSegment.js';
import type { IfcPipeSegmentTypeEnum } from '../enums/IfcPipeSegmentTypeEnum.js';

export interface IfcPipeSegment extends IfcFlowSegment {
  PredefinedType?: IfcPipeSegmentTypeEnum | null;
}
