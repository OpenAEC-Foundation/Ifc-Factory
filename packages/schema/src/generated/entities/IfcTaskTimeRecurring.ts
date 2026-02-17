import type { IfcTaskTime } from './IfcTaskTime.js';
import type { IfcRecurrencePattern } from './IfcRecurrencePattern.js';

export interface IfcTaskTimeRecurring extends IfcTaskTime {
  Recurrence: IfcRecurrencePattern;
}
