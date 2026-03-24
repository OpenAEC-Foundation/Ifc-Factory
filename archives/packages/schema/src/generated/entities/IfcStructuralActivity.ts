import type { IfcProduct } from './IfcProduct.js';
import type { IfcStructuralLoad } from './IfcStructuralLoad.js';
import type { IfcGlobalOrLocalEnum } from '../enums/IfcGlobalOrLocalEnum.js';

export interface IfcStructuralActivity extends IfcProduct {
  AppliedLoad: IfcStructuralLoad;
  GlobalOrLocal: IfcGlobalOrLocalEnum;
}
