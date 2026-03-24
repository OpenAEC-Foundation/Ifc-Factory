import type { IfcLabel } from '../types/IfcLabel.js';
import type { IfcCurve } from './IfcCurve.js';
import type { IfcBoolean } from '../types/IfcBoolean.js';

export interface IfcGridAxis {
  readonly type: string;
  AxisTag?: IfcLabel | null;
  AxisCurve: IfcCurve;
  SameSense: IfcBoolean;
}
