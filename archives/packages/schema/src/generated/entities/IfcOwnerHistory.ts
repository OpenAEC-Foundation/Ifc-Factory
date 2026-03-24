import type { IfcPersonAndOrganization } from './IfcPersonAndOrganization.js';
import type { IfcApplication } from './IfcApplication.js';
import type { IfcStateEnum } from '../enums/IfcStateEnum.js';
import type { IfcChangeActionEnum } from '../enums/IfcChangeActionEnum.js';
import type { IfcTimeStamp } from '../types/IfcTimeStamp.js';

export interface IfcOwnerHistory {
  readonly type: string;
  OwningUser: IfcPersonAndOrganization;
  OwningApplication: IfcApplication;
  State?: IfcStateEnum | null;
  ChangeAction?: IfcChangeActionEnum | null;
  LastModifiedDate?: IfcTimeStamp | null;
  LastModifyingUser?: IfcPersonAndOrganization | null;
  LastModifyingApplication?: IfcApplication | null;
  CreationDate: IfcTimeStamp;
}
