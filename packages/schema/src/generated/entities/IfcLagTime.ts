import type { IfcSchedulingTime } from './IfcSchedulingTime.js';
import type { IfcTimeOrRatioSelect } from '../selects/IfcTimeOrRatioSelect.js';
import type { IfcTaskDurationEnum } from '../enums/IfcTaskDurationEnum.js';

export interface IfcLagTime extends IfcSchedulingTime {
  LagValue: IfcTimeOrRatioSelect;
  DurationType: IfcTaskDurationEnum;
}
