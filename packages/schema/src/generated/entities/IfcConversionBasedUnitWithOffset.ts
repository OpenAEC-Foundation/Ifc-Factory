import type { IfcConversionBasedUnit } from './IfcConversionBasedUnit.js';
import type { IfcReal } from '../types/IfcReal.js';

export interface IfcConversionBasedUnitWithOffset extends IfcConversionBasedUnit {
  ConversionOffset: IfcReal;
}
