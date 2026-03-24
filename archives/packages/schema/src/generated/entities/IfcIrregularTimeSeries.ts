import type { IfcTimeSeries } from './IfcTimeSeries.js';
import type { IfcIrregularTimeSeriesValue } from './IfcIrregularTimeSeriesValue.js';

export interface IfcIrregularTimeSeries extends IfcTimeSeries {
  Values: IfcIrregularTimeSeriesValue[];
}
