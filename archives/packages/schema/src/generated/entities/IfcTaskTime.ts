import type { IfcSchedulingTime } from './IfcSchedulingTime.js';
import type { IfcTaskDurationEnum } from '../enums/IfcTaskDurationEnum.js';
import type { IfcDuration } from '../types/IfcDuration.js';
import type { IfcDateTime } from '../types/IfcDateTime.js';
import type { IfcBoolean } from '../types/IfcBoolean.js';
import type { IfcPositiveRatioMeasure } from '../types/IfcPositiveRatioMeasure.js';

export interface IfcTaskTime extends IfcSchedulingTime {
  DurationType?: IfcTaskDurationEnum | null;
  ScheduleDuration?: IfcDuration | null;
  ScheduleStart?: IfcDateTime | null;
  ScheduleFinish?: IfcDateTime | null;
  EarlyStart?: IfcDateTime | null;
  EarlyFinish?: IfcDateTime | null;
  LateStart?: IfcDateTime | null;
  LateFinish?: IfcDateTime | null;
  FreeFloat?: IfcDuration | null;
  TotalFloat?: IfcDuration | null;
  IsCritical?: IfcBoolean | null;
  StatusTime?: IfcDateTime | null;
  ActualDuration?: IfcDuration | null;
  ActualStart?: IfcDateTime | null;
  ActualFinish?: IfcDateTime | null;
  RemainingTime?: IfcDuration | null;
  Completion?: IfcPositiveRatioMeasure | null;
}
