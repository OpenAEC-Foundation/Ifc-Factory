import type { IfcSchedulingTime } from './IfcSchedulingTime.js';
import type { IfcDuration } from '../types/IfcDuration.js';
import type { IfcPositiveRatioMeasure } from '../types/IfcPositiveRatioMeasure.js';
import type { IfcDateTime } from '../types/IfcDateTime.js';
import type { IfcLabel } from '../types/IfcLabel.js';
import type { IfcBoolean } from '../types/IfcBoolean.js';

export interface IfcResourceTime extends IfcSchedulingTime {
  ScheduleWork?: IfcDuration | null;
  ScheduleUsage?: IfcPositiveRatioMeasure | null;
  ScheduleStart?: IfcDateTime | null;
  ScheduleFinish?: IfcDateTime | null;
  ScheduleContour?: IfcLabel | null;
  LevelingDelay?: IfcDuration | null;
  IsOverAllocated?: IfcBoolean | null;
  StatusTime?: IfcDateTime | null;
  ActualWork?: IfcDuration | null;
  ActualUsage?: IfcPositiveRatioMeasure | null;
  ActualStart?: IfcDateTime | null;
  ActualFinish?: IfcDateTime | null;
  RemainingWork?: IfcDuration | null;
  RemainingUsage?: IfcPositiveRatioMeasure | null;
  Completion?: IfcPositiveRatioMeasure | null;
}
