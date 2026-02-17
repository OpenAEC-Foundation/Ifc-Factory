import type { IfcModel } from '../model/ifc-model.js';
import { createPropertySet, assignPropertySet, type PropertyValue } from '../helpers/properties.js';

export function createBENGPropertySet(
  model: IfcModel,
  elementIds: number[],
  properties: {
    energieBehoefte?: number;
    primairFossieleEnergie?: number;
    aandeelHernieuwbareEnergie?: number;
    temperatuurOverschrijding?: number;
  },
): void {
  const props: PropertyValue[] = [];

  if (properties.energieBehoefte !== undefined) {
    props.push({ name: 'BENG1_EnergieBehoefte', value: properties.energieBehoefte, type: 'IFCREAL' });
  }
  if (properties.primairFossieleEnergie !== undefined) {
    props.push({ name: 'BENG2_PrimairFossieleEnergie', value: properties.primairFossieleEnergie, type: 'IFCREAL' });
  }
  if (properties.aandeelHernieuwbareEnergie !== undefined) {
    props.push({ name: 'BENG3_AandeelHernieuwbareEnergie', value: properties.aandeelHernieuwbareEnergie, type: 'IFCREAL' });
  }
  if (properties.temperatuurOverschrijding !== undefined) {
    props.push({ name: 'BENG4_TemperatuurOverschrijding', value: properties.temperatuurOverschrijding, type: 'IFCREAL' });
  }

  if (props.length > 0) {
    const pset = createPropertySet(model, 'Pset_BENG', props);
    assignPropertySet(model, pset.expressID, elementIds);
  }
}
