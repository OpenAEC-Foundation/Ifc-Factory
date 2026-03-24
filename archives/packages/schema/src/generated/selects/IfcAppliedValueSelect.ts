import type { IfcMeasureWithUnit } from '../entities/IfcMeasureWithUnit.js';
import type { IfcReference } from '../entities/IfcReference.js';
import type { IfcValue } from './IfcValue.js';

export type IfcAppliedValueSelect = IfcMeasureWithUnit | IfcReference | IfcValue;
