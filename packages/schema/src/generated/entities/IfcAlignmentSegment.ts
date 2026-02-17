import type { IfcLinearElement } from './IfcLinearElement.js';
import type { IfcAlignmentParameterSegment } from './IfcAlignmentParameterSegment.js';

export interface IfcAlignmentSegment extends IfcLinearElement {
  DesignParameters: IfcAlignmentParameterSegment;
}
