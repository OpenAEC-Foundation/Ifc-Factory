import type { IfcFlowSegment } from './IfcFlowSegment.js';
import type { IfcCableCarrierSegmentTypeEnum } from '../enums/IfcCableCarrierSegmentTypeEnum.js';

export interface IfcCableCarrierSegment extends IfcFlowSegment {
  PredefinedType?: IfcCableCarrierSegmentTypeEnum | null;
}
