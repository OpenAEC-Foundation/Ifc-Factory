import type { IfcBoundedCurve } from './IfcBoundedCurve.js';
import type { IfcCurve } from './IfcCurve.js';
import type { IfcTrimmingSelect } from '../selects/IfcTrimmingSelect.js';
import type { IfcBoolean } from '../types/IfcBoolean.js';
import type { IfcTrimmingPreference } from '../enums/IfcTrimmingPreference.js';

export interface IfcTrimmedCurve extends IfcBoundedCurve {
  BasisCurve: IfcCurve;
  Trim1: IfcTrimmingSelect[];
  Trim2: IfcTrimmingSelect[];
  SenseAgreement: IfcBoolean;
  MasterRepresentation: IfcTrimmingPreference;
}
