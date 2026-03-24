import type { IfcTime } from '../types/IfcTime.js';

export interface IfcTimePeriod {
  readonly type: string;
  StartTime: IfcTime;
  EndTime: IfcTime;
}
