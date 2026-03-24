import type { IfcGroup } from './IfcGroup.js';
import type { IfcIdentifier } from '../types/IfcIdentifier.js';
import type { IfcCostValue } from './IfcCostValue.js';
import type { IfcActorSelect } from '../selects/IfcActorSelect.js';
import type { IfcPerson } from './IfcPerson.js';
import type { IfcDate } from '../types/IfcDate.js';

export interface IfcAsset extends IfcGroup {
  Identification?: IfcIdentifier | null;
  OriginalValue?: IfcCostValue | null;
  CurrentValue?: IfcCostValue | null;
  TotalReplacementCost?: IfcCostValue | null;
  Owner?: IfcActorSelect | null;
  User?: IfcActorSelect | null;
  ResponsiblePerson?: IfcPerson | null;
  IncorporationDate?: IfcDate | null;
  DepreciatedValue?: IfcCostValue | null;
}
