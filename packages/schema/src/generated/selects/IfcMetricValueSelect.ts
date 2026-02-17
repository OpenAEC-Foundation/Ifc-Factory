import type { IfcAppliedValue } from '../entities/IfcAppliedValue.js';
import type { IfcMeasureWithUnit } from '../entities/IfcMeasureWithUnit.js';
import type { IfcReference } from '../entities/IfcReference.js';
import type { IfcTable } from '../entities/IfcTable.js';
import type { IfcTimeSeries } from '../entities/IfcTimeSeries.js';
import type { IfcValue } from './IfcValue.js';

export type IfcMetricValueSelect = IfcAppliedValue | IfcMeasureWithUnit | IfcReference | IfcTable | IfcTimeSeries | IfcValue;
