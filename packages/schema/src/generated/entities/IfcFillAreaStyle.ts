import type { IfcPresentationStyle } from './IfcPresentationStyle.js';
import type { IfcFillStyleSelect } from '../selects/IfcFillStyleSelect.js';
import type { IfcBoolean } from '../types/IfcBoolean.js';

export interface IfcFillAreaStyle extends IfcPresentationStyle {
  FillStyles: IfcFillStyleSelect[];
  ModelOrDraughting?: IfcBoolean | null;
}
