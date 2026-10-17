import type {BBox, LonLat, OptionLetter} from '../types';

/**
 * The 3-step drill-down:
 *   Round 1 → one of 4 ZONES on the world map
 *   Round 2 → one of 4 SUBREGIONS inside that zone
 *   Round 3 → one of 4 CITIES inside that subregion
 *
 * Country names must match world-atlas/countries-50m.json exactly
 * (run `npm run validate-data` after editing).
 */

export type Zone = {
  id: string;
  letter: OptionLetter;
  name: string;
  /** Where the letter badge sits on the world map */
  labelAt: LonLat;
  view: BBox;
};

export type Subregion = {
  id: string;
  zone: string;
  letter: OptionLetter;
  name: string;
  labelAt: LonLat;
  view: BBox;
  countries: string[];
};

export const WORLD_VIEW: BBox = [-170, -50, 190, 72];

export const ZONES: Zone[] = [
  {id: 'americas', letter: 'A', name: 'The Americas', labelAt: [-98, 18], view: [-168, -56, -25, 72]},
  {id: 'eurasia', letter: 'B', name: 'Europe & Asia', labelAt: [80, 50], view: [-25, -10, 150, 70]},
  {id: 'africa', letter: 'C', name: 'Africa', labelAt: [20, 3], view: [-20, -36, 55, 38]},
  {id: 'oceania', letter: 'D', name: 'Oceania', labelAt: [135, -25], view: [110, -48, -150, 12]},
];

export const SUBREGIONS: Subregion[] = [
  // ── The Americas ──
  {
    id: 'am-north',
    zone: 'americas',
    letter: 'A',
    name: 'USA & Canada',
    labelAt: [-100, 45],
    view: [-170, 18, -15, 72],
    countries: ['United States of America', 'Canada', 'Greenland', 'St. Pierre and Miquelon', 'Bermuda'],
  },
  {
    id: 'am-central',
    zone: 'americas',
    letter: 'B',
    name: 'Mexico, Central America & Caribbean',
    labelAt: [-95, 20],
    view: [-118, 6, -59, 33],
    countries: [
      'Mexico', 'Guatemala', 'Belize', 'Honduras', 'El Salvador', 'Nicaragua', 'Costa Rica', 'Panama',
      'Cuba', 'Jamaica', 'Haiti', 'Dominican Rep.', 'Puerto Rico', 'Bahamas', 'Turks and Caicos Is.',
      'Cayman Is.', 'British Virgin Is.', 'U.S. Virgin Is.', 'Anguilla', 'St-Martin', 'Sint Maarten',
      'St-Barthélemy', 'Antigua and Barb.', 'St. Kitts and Nevis', 'Montserrat', 'Dominica', 'Saint Lucia',
      'St. Vin. and Gren.', 'Barbados', 'Grenada', 'Trinidad and Tobago', 'Aruba', 'Curaçao',
    ],
  },
  {
    id: 'am-brazil',
    zone: 'americas',
    letter: 'C',
    name: 'Brazil & Northern South America',
    labelAt: [-55, -8],
    view: [-82, -34, -34, 13],
    countries: ['Brazil', 'Colombia', 'Venezuela', 'Guyana', 'Suriname'],
  },
  {
    id: 'am-south',
    zone: 'americas',
    letter: 'D',
    name: 'Andes & Southern Cone',
    labelAt: [-67, -33],
    view: [-82, -56, -48, 2],
    countries: ['Ecuador', 'Peru', 'Bolivia', 'Chile', 'Argentina', 'Paraguay', 'Uruguay', 'Falkland Is.', 'S. Geo. and the Is.'],
  },

  // ── Europe & Asia ──
  {
    id: 'eu-west',
    zone: 'eurasia',
    letter: 'A',
    name: 'Western Europe',
    labelAt: [2, 47],
    view: [-25, 35, 32, 71],
    countries: [
      'United Kingdom', 'Ireland', 'Isle of Man', 'Guernsey', 'Jersey', 'Iceland', 'Faeroe Is.', 'Norway',
      'Sweden', 'Finland', 'Åland', 'Denmark', 'France', 'Belgium', 'Netherlands', 'Luxembourg', 'Germany',
      'Switzerland', 'Liechtenstein', 'Austria', 'Spain', 'Portugal', 'Andorra', 'Monaco', 'Italy',
      'San Marino', 'Vatican', 'Malta',
    ],
  },
  {
    id: 'eu-east',
    zone: 'eurasia',
    letter: 'B',
    name: 'Eastern Europe',
    labelAt: [32, 52],
    view: [12, 34, 62, 70],
    countries: [
      'Poland', 'Czechia', 'Slovakia', 'Hungary', 'Slovenia', 'Croatia', 'Bosnia and Herz.', 'Serbia',
      'Montenegro', 'Kosovo', 'Albania', 'Macedonia', 'Greece', 'Bulgaria', 'Romania', 'Moldova', 'Ukraine',
      'Belarus', 'Lithuania', 'Latvia', 'Estonia', 'Russia', 'Cyprus', 'N. Cyprus',
    ],
  },
  {
    id: 'as-west',
    zone: 'eurasia',
    letter: 'C',
    name: 'Middle East & Central Asia',
    labelAt: [55, 32],
    view: [25, 12, 88, 55],
    countries: [
      'Turkey', 'Georgia', 'Armenia', 'Azerbaijan', 'Syria', 'Lebanon', 'Israel', 'Palestine', 'Jordan',
      'Iraq', 'Iran', 'Saudi Arabia', 'Yemen', 'Oman', 'United Arab Emirates', 'Qatar', 'Bahrain', 'Kuwait',
      'Kazakhstan', 'Uzbekistan', 'Turkmenistan', 'Kyrgyzstan', 'Tajikistan', 'Afghanistan', 'Pakistan',
    ],
  },
  {
    id: 'as-east',
    zone: 'eurasia',
    letter: 'D',
    name: 'South & East Asia',
    labelAt: [105, 30],
    view: [62, -11, 150, 60],
    countries: [
      'India', 'Nepal', 'Bhutan', 'Bangladesh', 'Sri Lanka', 'Maldives', 'Siachen Glacier', 'Br. Indian Ocean Ter.',
      'China', 'Hong Kong', 'Macao', 'Taiwan', 'Mongolia', 'Japan', 'North Korea', 'South Korea', 'Myanmar',
      'Thailand', 'Laos', 'Cambodia', 'Vietnam', 'Malaysia', 'Singapore', 'Brunei', 'Indonesia', 'Philippines',
      'Timor-Leste', 'Indian Ocean Ter.',
    ],
  },

  // ── Africa ──
  {
    id: 'af-north',
    zone: 'africa',
    letter: 'A',
    name: 'North Africa',
    labelAt: [12, 27],
    view: [-18, 8, 40, 38],
    countries: ['Morocco', 'W. Sahara', 'Algeria', 'Tunisia', 'Libya', 'Egypt', 'Sudan'],
  },
  {
    id: 'af-west',
    zone: 'africa',
    letter: 'B',
    name: 'West Africa',
    labelAt: [-5, 13],
    view: [-26, 3, 16, 26],
    countries: [
      'Mauritania', 'Mali', 'Niger', 'Senegal', 'Gambia', 'Guinea-Bissau', 'Guinea', 'Sierra Leone', 'Liberia',
      "Côte d'Ivoire", 'Burkina Faso', 'Ghana', 'Togo', 'Benin', 'Nigeria', 'Cabo Verde', 'Saint Helena',
    ],
  },
  {
    id: 'af-east',
    zone: 'africa',
    letter: 'C',
    name: 'Central & East Africa',
    labelAt: [28, 2],
    view: [8, -12, 52, 24],
    countries: [
      'Chad', 'Central African Rep.', 'Cameroon', 'Eq. Guinea', 'Gabon', 'Congo', 'Dem. Rep. Congo',
      'São Tomé and Principe', 'S. Sudan', 'Ethiopia', 'Eritrea', 'Djibouti', 'Somalia', 'Somaliland', 'Kenya',
      'Uganda', 'Rwanda', 'Burundi', 'Tanzania', 'Seychelles',
    ],
  },
  {
    id: 'af-south',
    zone: 'africa',
    letter: 'D',
    name: 'Southern Africa',
    labelAt: [26, -20],
    view: [10, -36, 52, -5],
    countries: [
      'Angola', 'Zambia', 'Malawi', 'Mozambique', 'Zimbabwe', 'Botswana', 'Namibia', 'South Africa', 'Lesotho',
      'eSwatini', 'Madagascar', 'Comoros', 'Mauritius', 'Fr. S. Antarctic Lands', 'Heard I. and McDonald Is.',
    ],
  },

  // ── Oceania ──
  {
    id: 'oc-west',
    zone: 'oceania',
    letter: 'A',
    name: 'West & Central Australia',
    labelAt: [124, -25],
    view: [111, -36, 140, -10],
    countries: ['Australia', 'Ashmore and Cartier Is.'],
  },
  {
    id: 'oc-east',
    zone: 'oceania',
    letter: 'B',
    name: 'Eastern Australia',
    labelAt: [145, -24],
    view: [136, -44, 156, -9],
    countries: ['Norfolk Island'],
  },
  {
    id: 'oc-nz',
    zone: 'oceania',
    letter: 'C',
    name: 'New Zealand',
    labelAt: [172, -42],
    view: [165, -48, 179.5, -33],
    countries: ['New Zealand'],
  },
  {
    id: 'oc-pacific',
    zone: 'oceania',
    letter: 'D',
    name: 'Pacific Islands',
    labelAt: [160, -6],
    view: [130, -25, -150, 15],
    countries: [
      'Papua New Guinea', 'Solomon Is.', 'Vanuatu', 'Fiji', 'New Caledonia', 'Samoa', 'American Samoa', 'Tonga',
      'Kiribati', 'Micronesia', 'Marshall Is.', 'Palau', 'Nauru', 'Fr. Polynesia', 'Cook Is.', 'Niue',
      'Pitcairn Is.', 'Wallis and Futuna Is.', 'Guam', 'N. Mariana Is.',
    ],
  },
];

/**
 * Overseas parts of a country that belong to a different subregion.
 * Matched against each polygon's centroid (and against points when resolving a place).
 */
export const BOX_OVERRIDES: {country: string; box: BBox; sub: string}[] = [
  {country: 'France', box: [-56, 1, -50, 7], sub: 'am-brazil'}, // French Guiana
  {country: 'France', box: [-64, 13, -60, 19], sub: 'am-central'}, // Guadeloupe, Martinique
  {country: 'France', box: [44, -22, 58, -11], sub: 'af-south'}, // Réunion, Mayotte
  {country: 'Netherlands', box: [-70, 11, -62, 19], sub: 'am-central'}, // Caribbean Netherlands
  {country: 'Russia', box: [-180, 40, -160, 80], sub: 'as-east'}, // Chukotka east of 180°
];

/** Countries cut in two along a meridian. Mercator keeps meridians vertical, so the map can clip with a rect. */
export const LON_SPLITS: {country: string; at: number; west: string; east: string}[] = [
  {country: 'Russia', at: 60, west: 'eu-east', east: 'as-east'},
  {country: 'Australia', at: 138, west: 'oc-west', east: 'oc-east'},
];

/** Countries never offered as a wrong answer (round-3 decoy cities or countries). They can still be the answer. */
export const EXCLUDED_FROM_OPTIONS = new Set(['Russia']);
export const canBeOption = (country?: string) => !country || !EXCLUDED_FROM_OPTIONS.has(country);

export const zoneById = (id: string) => ZONES.find((z) => z.id === id);
export const subById = (id: string) => SUBREGIONS.find((s) => s.id === id);
export const subsOfZone = (zoneId: string) => SUBREGIONS.filter((s) => s.zone === zoneId);
