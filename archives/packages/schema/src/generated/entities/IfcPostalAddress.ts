import type { IfcAddress } from './IfcAddress.js';
import type { IfcLabel } from '../types/IfcLabel.js';

export interface IfcPostalAddress extends IfcAddress {
  InternalLocation?: IfcLabel | null;
  AddressLines?: IfcLabel[] | null;
  PostalBox?: IfcLabel | null;
  Town?: IfcLabel | null;
  Region?: IfcLabel | null;
  PostalCode?: IfcLabel | null;
  Country?: IfcLabel | null;
}
