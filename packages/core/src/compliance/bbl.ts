import type { IfcModel } from '../model/ifc-model.js';
import { createPropertySet, assignPropertySet, type PropertyValue } from '../helpers/properties.js';

export function createBBLPropertySet(
  model: IfcModel,
  elementIds: number[],
  properties: {
    brandklasse?: string;
    rookklasse?: string;
    brandwerendheid?: number;
    wbdbo?: number;
  },
): void {
  const props: PropertyValue[] = [];

  if (properties.brandklasse !== undefined) {
    props.push({ name: 'Brandklasse', value: properties.brandklasse, type: 'IFCLABEL' });
  }
  if (properties.rookklasse !== undefined) {
    props.push({ name: 'Rookklasse', value: properties.rookklasse, type: 'IFCLABEL' });
  }
  if (properties.brandwerendheid !== undefined) {
    props.push({ name: 'Brandwerendheid', value: properties.brandwerendheid, type: 'IFCINTEGER' });
  }
  if (properties.wbdbo !== undefined) {
    props.push({ name: 'WBDBO', value: properties.wbdbo, type: 'IFCINTEGER' });
  }

  if (props.length > 0) {
    const pset = createPropertySet(model, 'Pset_BBL', props);
    assignPropertySet(model, pset.expressID, elementIds);
  }
}
