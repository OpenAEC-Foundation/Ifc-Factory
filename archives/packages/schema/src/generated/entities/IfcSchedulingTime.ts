import type { IfcLabel } from '../types/IfcLabel.js';
import type { IfcDataOriginEnum } from '../enums/IfcDataOriginEnum.js';

export interface IfcSchedulingTime {
  readonly type: string;
  Name?: IfcLabel | null;
  DataOrigin?: IfcDataOriginEnum | null;
  UserDefinedDataOrigin?: IfcLabel | null;
}
