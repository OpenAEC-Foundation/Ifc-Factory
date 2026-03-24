import type { IfcSchedulingTime } from './IfcSchedulingTime.js';
import type { IfcDateTime } from '../types/IfcDateTime.js';

export interface IfcEventTime extends IfcSchedulingTime {
  ActualDate?: IfcDateTime | null;
  EarlyDate?: IfcDateTime | null;
  LateDate?: IfcDateTime | null;
  ScheduleDate?: IfcDateTime | null;
}
