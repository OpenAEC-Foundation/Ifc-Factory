import type { IfcGeometricRepresentationItem } from './IfcGeometricRepresentationItem.js';
import type { IfcPresentableText } from '../types/IfcPresentableText.js';
import type { IfcAxis2Placement } from '../selects/IfcAxis2Placement.js';
import type { IfcTextPath } from '../enums/IfcTextPath.js';

export interface IfcTextLiteral extends IfcGeometricRepresentationItem {
  Literal: IfcPresentableText;
  Placement: IfcAxis2Placement;
  Path: IfcTextPath;
}
