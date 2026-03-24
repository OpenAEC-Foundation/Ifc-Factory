import type { IfcControl } from './IfcControl.js';
import type { IfcCostItemTypeEnum } from '../enums/IfcCostItemTypeEnum.js';
import type { IfcCostValue } from './IfcCostValue.js';
import type { IfcPhysicalQuantity } from './IfcPhysicalQuantity.js';

export interface IfcCostItem extends IfcControl {
  PredefinedType?: IfcCostItemTypeEnum | null;
  CostValues?: IfcCostValue[] | null;
  CostQuantities?: IfcPhysicalQuantity[] | null;
}
