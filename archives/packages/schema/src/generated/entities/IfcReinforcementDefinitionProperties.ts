import type { IfcPreDefinedPropertySet } from './IfcPreDefinedPropertySet.js';
import type { IfcLabel } from '../types/IfcLabel.js';
import type { IfcSectionReinforcementProperties } from './IfcSectionReinforcementProperties.js';

export interface IfcReinforcementDefinitionProperties extends IfcPreDefinedPropertySet {
  DefinitionType?: IfcLabel | null;
  ReinforcementSectionDefinitions: IfcSectionReinforcementProperties[];
}
