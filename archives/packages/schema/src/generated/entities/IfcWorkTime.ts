import type { IfcSchedulingTime } from './IfcSchedulingTime.js';
import type { IfcRecurrencePattern } from './IfcRecurrencePattern.js';
import type { IfcDate } from '../types/IfcDate.js';

export interface IfcWorkTime extends IfcSchedulingTime {
  RecurrencePattern?: IfcRecurrencePattern | null;
  StartDate?: IfcDate | null;
  FinishDate?: IfcDate | null;
}
