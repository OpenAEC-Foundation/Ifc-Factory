import type { IfcDerivedMeasureValue } from './IfcDerivedMeasureValue.js';
import type { IfcMeasureValue } from './IfcMeasureValue.js';
import type { IfcSimpleValue } from './IfcSimpleValue.js';

export type IfcValue = IfcDerivedMeasureValue | IfcMeasureValue | IfcSimpleValue;
