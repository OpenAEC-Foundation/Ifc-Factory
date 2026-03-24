import type { IfcFlowSegment } from './IfcFlowSegment.js';
import type { IfcDuctSegmentTypeEnum } from '../enums/IfcDuctSegmentTypeEnum.js';

export interface IfcDuctSegment extends IfcFlowSegment {
  PredefinedType?: IfcDuctSegmentTypeEnum | null;
}
