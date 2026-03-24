import type { IfcGroup } from './IfcGroup.js';
import type { IfcInventoryTypeEnum } from '../enums/IfcInventoryTypeEnum.js';
import type { IfcActorSelect } from '../selects/IfcActorSelect.js';
import type { IfcPerson } from './IfcPerson.js';
import type { IfcDate } from '../types/IfcDate.js';
import type { IfcCostValue } from './IfcCostValue.js';

export interface IfcInventory extends IfcGroup {
  PredefinedType?: IfcInventoryTypeEnum | null;
  Jurisdiction?: IfcActorSelect | null;
  ResponsiblePersons?: IfcPerson[] | null;
  LastUpdateDate?: IfcDate | null;
  CurrentValue?: IfcCostValue | null;
  OriginalValue?: IfcCostValue | null;
}
