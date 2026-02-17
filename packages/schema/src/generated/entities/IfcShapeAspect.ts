import type { IfcShapeModel } from './IfcShapeModel.js';
import type { IfcLabel } from '../types/IfcLabel.js';
import type { IfcText } from '../types/IfcText.js';
import type { IfcLogical } from '../types/IfcLogical.js';
import type { IfcProductRepresentationSelect } from '../selects/IfcProductRepresentationSelect.js';

export interface IfcShapeAspect {
  readonly type: string;
  ShapeRepresentations: IfcShapeModel[];
  Name?: IfcLabel | null;
  Description?: IfcText | null;
  ProductDefinitional: IfcLogical;
  PartOfProductDefinitionShape?: IfcProductRepresentationSelect | null;
}
