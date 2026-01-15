import { MediaAsset, Brand, Location } from './index';

export interface Event {
  id: number;
  documentId: string;
  name: string;
  description?: string | null;
  start_date: string;
  end_date: string;
  image?: MediaAsset | null;
  website?: string | null;
  contact_email?: string | null;
  ticket_price?: number | null;
  is_free?: boolean;
  max_attendees?: number | null;
  event_type?: string | null;
  eventHostBrand?: Brand | null;
  city?: Location | null;
  physicalLocation?: string | null;
  ticketsAvailable?: boolean;
}
