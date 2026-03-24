import type { IfcTimeSeries } from './IfcTimeSeries.js';
import type { IfcTimeMeasure } from '../types/IfcTimeMeasure.js';
import type { IfcTimeSeriesValue } from './IfcTimeSeriesValue.js';

export interface IfcRegularTimeSeries extends IfcTimeSeries {
  TimeStep: IfcTimeMeasure;
  Values: IfcTimeSeriesValue[];
}
