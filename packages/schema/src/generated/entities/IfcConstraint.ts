import type { IfcLabel } from '../types/IfcLabel.js';
import type { IfcText } from '../types/IfcText.js';
import type { IfcConstraintEnum } from '../enums/IfcConstraintEnum.js';
import type { IfcActorSelect } from '../selects/IfcActorSelect.js';
import type { IfcDateTime } from '../types/IfcDateTime.js';

export interface IfcConstraint {
  readonly type: string;
  Name: IfcLabel;
  Description?: IfcText | null;
  ConstraintGrade: IfcConstraintEnum;
  ConstraintSource?: IfcLabel | null;
  CreatingActor?: IfcActorSelect | null;
  CreationTime?: IfcDateTime | null;
  UserDefinedGrade?: IfcLabel | null;
}
