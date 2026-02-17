import type { IfcRelConnects } from './IfcRelConnects.js';
import type { IfcSystem } from './IfcSystem.js';
import type { IfcSpatialElement } from './IfcSpatialElement.js';

export interface IfcRelServicesBuildings extends IfcRelConnects {
  RelatingSystem: IfcSystem;
  RelatedBuildings: IfcSpatialElement[];
}
