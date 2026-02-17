import type { IfcRelConnects } from './IfcRelConnects.js';
import type { IfcSpaceBoundarySelect } from '../selects/IfcSpaceBoundarySelect.js';
import type { IfcElement } from './IfcElement.js';
import type { IfcConnectionGeometry } from './IfcConnectionGeometry.js';
import type { IfcPhysicalOrVirtualEnum } from '../enums/IfcPhysicalOrVirtualEnum.js';
import type { IfcInternalOrExternalEnum } from '../enums/IfcInternalOrExternalEnum.js';

export interface IfcRelSpaceBoundary extends IfcRelConnects {
  RelatingSpace: IfcSpaceBoundarySelect;
  RelatedBuildingElement: IfcElement;
  ConnectionGeometry?: IfcConnectionGeometry | null;
  PhysicalOrVirtualBoundary: IfcPhysicalOrVirtualEnum;
  InternalOrExternalBoundary: IfcInternalOrExternalEnum;
}
