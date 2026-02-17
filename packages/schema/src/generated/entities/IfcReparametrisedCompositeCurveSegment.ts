import type { IfcCompositeCurveSegment } from './IfcCompositeCurveSegment.js';
import type { IfcParameterValue } from '../types/IfcParameterValue.js';

export interface IfcReparametrisedCompositeCurveSegment extends IfcCompositeCurveSegment {
  ParamLength: IfcParameterValue;
}
