import type { IfcSweptAreaSolid } from './IfcSweptAreaSolid.js';
import type { IfcCurve } from './IfcCurve.js';
import type { IfcCurveMeasureSelect } from '../selects/IfcCurveMeasureSelect.js';

export interface IfcDirectrixCurveSweptAreaSolid extends IfcSweptAreaSolid {
  Directrix: IfcCurve;
  StartParam?: IfcCurveMeasureSelect | null;
  EndParam?: IfcCurveMeasureSelect | null;
}
