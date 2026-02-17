import type { IfcFlowSegment } from './IfcFlowSegment.js';
import type { IfcCableSegmentTypeEnum } from '../enums/IfcCableSegmentTypeEnum.js';

export interface IfcCableSegment extends IfcFlowSegment {
  PredefinedType?: IfcCableSegmentTypeEnum | null;
}
