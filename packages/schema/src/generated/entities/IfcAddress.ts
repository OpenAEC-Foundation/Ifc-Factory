import type { IfcAddressTypeEnum } from '../enums/IfcAddressTypeEnum.js';
import type { IfcText } from '../types/IfcText.js';
import type { IfcLabel } from '../types/IfcLabel.js';

export interface IfcAddress {
  readonly type: string;
  Purpose?: IfcAddressTypeEnum | null;
  Description?: IfcText | null;
  UserDefinedPurpose?: IfcLabel | null;
}
