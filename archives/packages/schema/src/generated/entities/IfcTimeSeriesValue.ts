import type { IfcValue } from '../selects/IfcValue.js';

export interface IfcTimeSeriesValue {
  readonly type: string;
  ListValues: IfcValue[];
}
