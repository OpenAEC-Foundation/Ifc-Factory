import type { IfcConstraint } from './IfcConstraint.js';
import type { IfcBenchmarkEnum } from '../enums/IfcBenchmarkEnum.js';
import type { IfcLabel } from '../types/IfcLabel.js';
import type { IfcMetricValueSelect } from '../selects/IfcMetricValueSelect.js';
import type { IfcReference } from './IfcReference.js';

export interface IfcMetric extends IfcConstraint {
  Benchmark: IfcBenchmarkEnum;
  ValueSource?: IfcLabel | null;
  DataValue?: IfcMetricValueSelect | null;
  ReferencePath?: IfcReference | null;
}
