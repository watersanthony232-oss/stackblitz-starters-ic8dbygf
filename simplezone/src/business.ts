// A business on Simple Zone, as read from the published "Simplezone live" sheet (public details only).

import type { Week } from './hours';

export type Shop = {
  id: string;
  name: string;
  category: string;
  /** The area exactly as typed in the sheet. */
  area: string;
  /** From the area's centre point; missing if the area isn't one we know. */
  lat?: number;
  lon?: number;
  sells: string[];
  /** Missing if the opening hours couldn't be read for certain. */
  hours?: Week;
  /** The opening hours exactly as the business typed them. */
  hoursText?: string;
  phone?: string;
  whatsapp?: string;
  website?: string;
  plus?: boolean;
};
