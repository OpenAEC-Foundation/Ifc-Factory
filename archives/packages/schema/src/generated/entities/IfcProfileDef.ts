import type { IfcProfileTypeEnum } from '../enums/IfcProfileTypeEnum.js';
import type { IfcLabel } from '../types/IfcLabel.js';

export interface IfcProfileDef {
  readonly type: string;
  ProfileType: IfcProfileTypeEnum;
  ProfileName?: IfcLabel | null;
}
