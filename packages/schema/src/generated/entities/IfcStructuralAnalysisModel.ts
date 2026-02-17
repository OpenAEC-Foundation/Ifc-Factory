import type { IfcSystem } from './IfcSystem.js';
import type { IfcAnalysisModelTypeEnum } from '../enums/IfcAnalysisModelTypeEnum.js';
import type { IfcAxis2Placement3D } from './IfcAxis2Placement3D.js';
import type { IfcStructuralLoadGroup } from './IfcStructuralLoadGroup.js';
import type { IfcStructuralResultGroup } from './IfcStructuralResultGroup.js';
import type { IfcObjectPlacement } from './IfcObjectPlacement.js';

export interface IfcStructuralAnalysisModel extends IfcSystem {
  PredefinedType: IfcAnalysisModelTypeEnum;
  OrientationOf2DPlane?: IfcAxis2Placement3D | null;
  LoadedBy?: IfcStructuralLoadGroup[] | null;
  HasResults?: IfcStructuralResultGroup[] | null;
  SharedPlacement?: IfcObjectPlacement | null;
}
