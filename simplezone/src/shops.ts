// The shops in the app. Real businesses joined through the "Join Simple Zone" form.
// Shops marked `example` are pretend ones that show how a listing looks, like on the website.

import { week, type Week } from './hours';

export type Shop = {
  id: string;
  name: string;
  category: string;
  area: string;
  lat: number;
  lon: number;
  /** Only shown when the business said yes to showing its address. */
  address?: string;
  about?: string;
  sells: string[];
  hours: Week;
  hoursNote?: string;
  phone?: string;
  whatsapp?: string;
  website?: string;
  facebook?: string;
  offer?: string;
  studentDiscount?: string;
  parking?: string;
  plus?: boolean;
  example?: boolean;
};

export const SHOPS: Shop[] = [
  {
    id: 'holistic-directions',
    name: 'Holistic Directions',
    category: 'Wellbeing clinic',
    area: 'Harefield',
    lat: 50.92,
    lon: -1.346,
    about: 'Sports massage therapy, acupuncture, lymphatic drainage massage, reflexology and CryoPen aesthetics.',
    sells: [
      'sports massage',
      'massage',
      'acupuncture',
      'manual lymphatic drainage massage',
      'reflexology',
      'cryopen aesthetics',
    ],
    hours: week({ 'mon-fri': '8-20', sat: '10-16' }),
    hoursNote: 'Open alternate Saturdays.',
    phone: '07399 275571',
    whatsapp: '07399 275571',
    website: 'https://www.holisticdirections.co.uk',
    studentDiscount: '10% off with a student card',
    plus: true,
  },
  {
    id: 'aurora-glance',
    name: 'Aurora Glance',
    category: 'Apps & websites',
    area: 'Millbrook',
    lat: 50.9268,
    lon: -1.4497,
    address: 'Mansel Road West, Southampton SO16 9LR',
    about: 'Apps and websites for local businesses, from Aurora Glance (part of Toz Industries). Makers of Simple Zone.',
    sells: ['apps', 'websites', 'app design', 'web design'],
    hours: week({ 'mon-thu': '11-13' }),
    phone: '07367 414672',
    whatsapp: '07367 414672',
    website: 'https://auroraglance.com',
    studentDiscount: 'Ask about the student discount',
  },
  {
    id: 'example-pub',
    name: 'Your Local Pub',
    category: 'Pub',
    area: 'Freemantle',
    lat: 50.9115,
    lon: -1.4262,
    address: '1 Example Road, Freemantle',
    about: "Example listing: a friendly local pub. The drinks list shows what's on right now.",
    sells: ['cider', 'thatchers cider', 'strongbow cider', 'pear cider', 'real ale', 'lager', 'pub quiz', 'sunday roast', 'beer garden'],
    hours: week({ 'mon-thu': '12-23', 'fri-sat': '12-24', sun: '12-22:30' }),
    offer: 'Cider of the week: £1 off a pint',
    website: 'https://example.com',
    facebook: 'https://facebook.com',
    parking: 'Free car park behind the pub.',
    example: true,
  },
  {
    id: 'example-cafe',
    name: 'Your Café',
    category: 'Café',
    area: 'Portswood',
    lat: 50.9255,
    lon: -1.3925,
    address: '2 Example Street, Portswood',
    about: 'Example listing: a neighbourhood café with breakfast all day.',
    sells: ['coffee', 'tea', 'breakfast', 'cakes', 'sandwiches', 'hot chocolate', 'toasties'],
    hours: week({ 'mon-sat': '7-15', sun: '9-14' }),
    offer: 'Free cake with any large coffee before 11am',
    studentDiscount: '10% off with a student card',
    example: true,
  },
  {
    id: 'example-phone-shop',
    name: 'Your Phone Shop',
    category: 'Phone repairs & accessories',
    area: 'Shirley',
    lat: 50.9232,
    lon: -1.4335,
    address: '3 Example High Street, Shirley',
    about: 'Example listing: screen repairs while you wait, cases and chargers.',
    sells: ['phone charger', 'phone case', 'screen repair', 'screen protector', 'headphones', 'sim cards'],
    hours: week({ 'mon-sat': '9-16', sun: '10-16' }),
    offer: 'Half price screen protector with any case',
    studentDiscount: '15% off repairs with a student card',
    example: true,
  },
  {
    id: 'example-salon',
    name: 'Your Salon',
    category: 'Hair & beauty',
    area: 'Shirley',
    lat: 50.9221,
    lon: -1.4318,
    address: '4 Example High Street, Shirley',
    about: 'Example listing: hair, nails and treatments. Walk-ins welcome.',
    sells: ['haircut', 'nails', 'massage', 'eyebrows', 'hair colour', 'blow dry'],
    hours: week({ 'tue-fri': '9-18', sat: '9-17' }),
    offer: '20% off this week',
    example: true,
  },
  {
    id: 'example-bakery',
    name: 'Your Bakery',
    category: 'Bakery',
    area: 'Lordshill',
    lat: 50.9448,
    lon: -1.4505,
    address: '5 Example Parade, Lordshill',
    about: 'Example listing: bread baked every morning.',
    sells: ['bread', 'birthday cakes', 'cakes', 'pasties', 'sausage rolls', 'sourdough'],
    hours: week({ 'mon-sat': '7-16' }),
    example: true,
  },
  {
    id: 'example-takeaway',
    name: 'Your Takeaway',
    category: 'Takeaway',
    area: 'Bitterne',
    lat: 50.9182,
    lon: -1.3598,
    address: '6 Example Road, Bitterne',
    about: 'Example listing: fish and chips, burgers and kebabs.',
    sells: ['takeaway', 'fish and chips', 'burgers', 'kebabs', 'pizza'],
    hours: week({ 'mon-thu': '16-23', 'fri-sat': '16-24', sun: '16-22' }),
    example: true,
  },
];
