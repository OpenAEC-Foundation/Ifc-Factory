import type { IfcRecurrenceTypeEnum } from '../enums/IfcRecurrenceTypeEnum.js';
import type { IfcDayInMonthNumber } from '../types/IfcDayInMonthNumber.js';
import type { IfcDayInWeekNumber } from '../types/IfcDayInWeekNumber.js';
import type { IfcMonthInYearNumber } from '../types/IfcMonthInYearNumber.js';
import type { IfcInteger } from '../types/IfcInteger.js';
import type { IfcTimePeriod } from './IfcTimePeriod.js';

export interface IfcRecurrencePattern {
  readonly type: string;
  RecurrenceType: IfcRecurrenceTypeEnum;
  DayComponent?: IfcDayInMonthNumber[] | null;
  WeekdayComponent?: IfcDayInWeekNumber[] | null;
  MonthComponent?: IfcMonthInYearNumber[] | null;
  Position?: IfcInteger | null;
  Interval?: IfcInteger | null;
  Occurrences?: IfcInteger | null;
  TimePeriods?: IfcTimePeriod[] | null;
}
