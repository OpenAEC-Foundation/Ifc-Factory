import type { IfcSimpleProperty } from './IfcSimpleProperty.js';
import type { IfcValue } from '../selects/IfcValue.js';
import type { IfcText } from '../types/IfcText.js';
import type { IfcUnit } from '../selects/IfcUnit.js';
import type { IfcCurveInterpolationEnum } from '../enums/IfcCurveInterpolationEnum.js';

export interface IfcPropertyTableValue extends IfcSimpleProperty {
  DefiningValues?: IfcValue[] | null;
  DefinedValues?: IfcValue[] | null;
  Expression?: IfcText | null;
  DefiningUnit?: IfcUnit | null;
  DefinedUnit?: IfcUnit | null;
  CurveInterpolation?: IfcCurveInterpolationEnum | null;
}
