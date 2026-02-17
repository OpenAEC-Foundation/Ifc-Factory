import type { IfcRoleEnum } from '../enums/IfcRoleEnum.js';
import type { IfcLabel } from '../types/IfcLabel.js';
import type { IfcText } from '../types/IfcText.js';

export interface IfcActorRole {
  readonly type: string;
  Role: IfcRoleEnum;
  UserDefinedRole?: IfcLabel | null;
  Description?: IfcText | null;
}
