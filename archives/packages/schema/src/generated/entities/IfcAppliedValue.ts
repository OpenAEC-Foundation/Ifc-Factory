import type { IfcLabel } from '../types/IfcLabel.js';
import type { IfcText } from '../types/IfcText.js';
import type { IfcAppliedValueSelect } from '../selects/IfcAppliedValueSelect.js';
import type { IfcMeasureWithUnit } from './IfcMeasureWithUnit.js';
import type { IfcDate } from '../types/IfcDate.js';
import type { IfcArithmeticOperatorEnum } from '../enums/IfcArithmeticOperatorEnum.js';

export interface IfcAppliedValue {
  readonly type: string;
  Name?: IfcLabel | null;
  Description?: IfcText | null;
  AppliedValue?: IfcAppliedValueSelect | null;
  UnitBasis?: IfcMeasureWithUnit | null;
  ApplicableDate?: IfcDate | null;
  FixedUntilDate?: IfcDate | null;
  Category?: IfcLabel | null;
  Condition?: IfcLabel | null;
  ArithmeticOperator?: IfcArithmeticOperatorEnum | null;
  Components?: IfcAppliedValue[] | null;
}
