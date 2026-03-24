import type { IfcRelAssignsToGroup } from './IfcRelAssignsToGroup.js';
import type { IfcRatioMeasure } from '../types/IfcRatioMeasure.js';

export interface IfcRelAssignsToGroupByFactor extends IfcRelAssignsToGroup {
  Factor: IfcRatioMeasure;
}
