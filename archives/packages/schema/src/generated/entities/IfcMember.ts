import type { IfcBuiltElement } from './IfcBuiltElement.js';
import type { IfcMemberTypeEnum } from '../enums/IfcMemberTypeEnum.js';

export interface IfcMember extends IfcBuiltElement {
  PredefinedType?: IfcMemberTypeEnum | null;
}
