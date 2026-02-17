import type { IfcGeometricRepresentationItem } from './IfcGeometricRepresentationItem.js';
import type { IfcCompositeCurve } from './IfcCompositeCurve.js';
import type { IfcProfileDef } from './IfcProfileDef.js';
import type { IfcAxis2Placement3D } from './IfcAxis2Placement3D.js';

export interface IfcSectionedSpine extends IfcGeometricRepresentationItem {
  SpineCurve: IfcCompositeCurve;
  CrossSections: IfcProfileDef[];
  CrossSectionPositions: IfcAxis2Placement3D[];
}
