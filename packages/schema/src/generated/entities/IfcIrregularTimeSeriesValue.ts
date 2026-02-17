import type { IfcDateTime } from '../types/IfcDateTime.js';
import type { IfcValue } from '../selects/IfcValue.js';

export interface IfcIrregularTimeSeriesValue {
  readonly type: string;
  TimeStamp: IfcDateTime;
  ListValues: IfcValue[];
}
