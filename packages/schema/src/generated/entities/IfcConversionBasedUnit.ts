import type { IfcNamedUnit } from './IfcNamedUnit.js';
import type { IfcLabel } from '../types/IfcLabel.js';
import type { IfcMeasureWithUnit } from './IfcMeasureWithUnit.js';

export interface IfcConversionBasedUnit extends IfcNamedUnit {
  Name: IfcLabel;
  ConversionFactor: IfcMeasureWithUnit;
}
