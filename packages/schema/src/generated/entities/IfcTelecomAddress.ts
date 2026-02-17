import type { IfcAddress } from './IfcAddress.js';
import type { IfcLabel } from '../types/IfcLabel.js';
import type { IfcURIReference } from '../types/IfcURIReference.js';

export interface IfcTelecomAddress extends IfcAddress {
  TelephoneNumbers?: IfcLabel[] | null;
  FacsimileNumbers?: IfcLabel[] | null;
  PagerNumber?: IfcLabel | null;
  ElectronicMailAddresses?: IfcLabel[] | null;
  WWWHomePageURL?: IfcURIReference | null;
  MessagingIDs?: IfcURIReference[] | null;
}
