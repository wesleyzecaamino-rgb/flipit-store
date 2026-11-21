export type CategoryId = 'ALL' | 'MEN' | 'WOMEN' | 'TRENDING' | 'SEASONAL' | 'ACCESSORIES';
export type ProductCategory = 'MEN' | 'WOMEN' | 'SEASONAL' | 'ACCESSORIES';
export type SizeCode = 'XS' | 'S' | 'M' | 'L' | 'XL' | 'OS';

export type SheetKey =
  | 'collage'
  | 'marquee'
  | 'cable_blanket'
  | 'cable_pillow'
  | 'cable_women_green'
  | 'cable_women_cream'
  | 'cable_men_cream'
  | 'cable_men_espresso'
  | 'cable_kids_cardigans'
  | 'cable_kids_cricket';

export interface SheetCrop {
  type: 'hero' | 'sheet';
  sheet?: SheetKey;
  cx?: number;
  cy?: number;
  cw?: number;
  ch?: number;
  fx?: number;
  fy?: number;
  url?: string;
}

export interface Product {
  id: string;
  title: string;
  subtitle: string;
  category: ProductCategory;
  tags: CategoryId[];
  colorway: string;
  priceCents: number;
  msrpCents?: number;
  sizes: SizeCode[];
  description: string;
  fabricNote: string;
  image: SheetCrop;
}

export interface CartItemData {
  itemId: string;
  productId: string;
  title: string;
  category: ProductCategory;
  colorway: string;
  size: SizeCode;
  priceCents: number;
  quantity: number;
}

export interface OrderItemPayload {
  productId: string;
  title: string;
  size: SizeCode;
  priceCents: number;
  quantity: number;
}

export const HERO_ATHLETE_URL =
  'https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20261114_120532_a504ce9e-4820-4193-8b7c-9b1abb1f45b9.png&w=1528&q=85';

const COLLAGE_INNER =
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20261114_120327_e42374b9-471e-4799-9dca-07fe8b4d6536.png';
const MARQUEE_INNER =
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20261114_120324_90c4bb35-2fb2-47a8-aa6e-14a7c92e2214.png';

export const STORE_SHEETS = {
  collage: {
    url: 'https://images.higgs.ai/?default=1&output=webp&url=' + encodeURIComponent(COLLAGE_INNER) + '&w=2048&q=85',
    w: 2048,
    h: 2048,
  },
  marquee: {
    url: 'https://images.higgs.ai/?default=1&output=webp&url=' + encodeURIComponent(MARQUEE_INNER) + '&w=1744&q=85',
    w: 1744,
    h: 2336,
  },
  cable_blanket: {
    url: '/assets/aistudio/Screenshot_2026-11-21_13_37_12_da9c8432.png',
    w: 1366,
    h: 768,
  },
  cable_pillow: {
    url: '/assets/aistudio/Screenshot_2026-11-21_13_37_05_3c4a55cc.png',
    w: 1366,
    h: 768,
  },
  cable_women_green: {
    url: '/assets/aistudio/Screenshot_2026-11-21_13_35_18_4e42410e.png',
    w: 1366,
    h: 768,
  },
  cable_women_cream: {
    url: '/assets/aistudio/Screenshot_2026-11-21_13_35_23_2cf0597d.png',
    w: 1366,
    h: 768,
  },
  cable_men_cream: {
    url: '/assets/aistudio/Screenshot_2026-11-21_13_35_04_2c4b2cee.png',
    w: 1366,
    h: 768,
  },
  cable_men_espresso: {
    url: '/assets/aistudio/Screenshot_2026-11-21_13_35_10_7be6b558.png',
    w: 1366,
    h: 768,
  },
  cable_kids_cardigans: {
    url: '/assets/aistudio/Screenshot_2026-11-21_13_36_51_fc607a96.png',
    w: 1366,
    h: 768,
  },
  cable_kids_cricket: {
    url: '/assets/aistudio/Screenshot_2026-11-21_13_35_30_00c958fb.png',
    w: 1366,
    h: 768,
  },
} as const;

export const CATEGORIES: { id: CategoryId; label: string }[] = [
  { id: 'ALL', label: 'ALL PIECES' },
  { id: 'MEN', label: 'MEN' },
  { id: 'WOMEN', label: 'WOMEN' },
  { id: 'TRENDING', label: 'TRENDING' },
  { id: 'SEASONAL', label: 'SEASONAL' },
  { id: 'ACCESSORIES', label: 'ACCESSORIES' },
];

export const PRODUCTS: Product[] = [
  {
    id: 'orchid-funnel-zip',
    title: 'Orchid Ribbed Funnel Full-Zip',
    subtitle: 'Hero Winter Drop Knit',
    category: 'MEN',
    tags: ['ALL', 'MEN', 'SEASONAL', 'TRENDING'],
    colorway: 'Misty Orchid',
    priceCents: 16800,
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    description:
      'Heavy-gauge ribbed knit full-zip engineered with a tall structured funnel collar and dropped shoulders for cold outdoor warm-ups.',
    fabricNote: '72% combed cotton-merino blend, 28% recycled nylon rib.',
    image: { type: 'hero', url: HERO_ATHLETE_URL },
  },
  {
    id: 'lilac-fleece-set',
    title: 'Lilac Brushed Half-Zip & Jogger',
    subtitle: 'Studio Fleece Two-Piece',
    category: 'WOMEN',
    tags: ['ALL', 'WOMEN', 'TRENDING'],
    colorway: 'Pale Lilac',
    priceCents: 19400,
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    description:
      'Plush brushed fleece half-zip paired with high-rise cuffed joggers. Built to lock in warmth before and after late studio sessions.',
    fabricNote: '420 GSM double-brushed organic cotton fleece.',
    image: { type: 'sheet', sheet: 'collage', cx: 1036, cy: 28, cw: 982, ch: 982, fx: 0.5, fy: 0.3 },
  },
  {
    id: 'orchid-funnel-profile',
    title: 'Orchid Sculpt Funnel Pullover',
    subtitle: 'Mid-Weight Studio Knit',
    category: 'MEN',
    tags: ['ALL', 'MEN', 'TRENDING', 'SEASONAL'],
    colorway: 'Heather Orchid',
    priceCents: 15800,
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    description:
      'Architectural high-collar knit pullover with breathable underarm gussets and a double-slider tonal zipper.',
    fabricNote: '4-way stretch rib knit with moisture-wicking interior channels.',
    image: { type: 'sheet', sheet: 'collage', cx: 29, cy: 28, cw: 982, ch: 982, fx: 0.5, fy: 0.2 },
  },
  {
    id: 'plum-fingerless-gloves',
    title: 'Plum Fleece & Fingerless Gloves',
    subtitle: 'Cold-Run Hand Warmers',
    category: 'ACCESSORIES',
    tags: ['ALL', 'ACCESSORIES', 'SEASONAL'],
    colorway: 'Deep Plum / Lilac',
    priceCents: 5400,
    sizes: ['OS'],
    description:
      'Ribbed lilac fingerless knit wrist warmers paired with deep plum fleece cuffs so hands stay warm without losing bar grip.',
    fabricNote: 'Soft-touch merino-acrylic rib with reinforced thumb opening.',
    image: { type: 'sheet', sheet: 'collage', cx: 29, cy: 1036, cw: 982, ch: 982, fx: 0.5, fy: 0.45 },
  },
  {
    id: 'winter-capsule-pack',
    title: 'Winter Orchid Studio Capsule',
    subtitle: '4-Piece Layering Edit',
    category: 'SEASONAL',
    tags: ['ALL', 'SEASONAL', 'TRENDING', 'MEN', 'WOMEN'],
    colorway: 'Orchid / Lilac / Plum',
    priceCents: 21000,
    msrpCents: 24800,
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    description:
      'Curated cold-weather training capsule uniting our signature ribbed half-zips and brushed fleece layers across all three winter dye lots.',
    fabricNote: 'Lofted knit + brushed fleece thermal layering system.',
    image: { type: 'sheet', sheet: 'marquee', cx: 0, cy: 0, cw: 866, ch: 1159, fx: 0.5, fy: 0.65 },
  },
  {
    id: 'lilac-ribbed-track',
    title: 'Lilac Ribbed Half-Zip Track Set',
    subtitle: 'Full-Length Knit Kit',
    category: 'WOMEN',
    tags: ['ALL', 'WOMEN', 'TRENDING'],
    colorway: 'Soft Lilac',
    priceCents: 18800,
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    description:
      'Full-length matching ribbed half-zip and tapered track pants designed for zero bulk and unrestricted mobility.',
    fabricNote: 'Breathable vertical rib knit with concealed zip pockets.',
    image: { type: 'sheet', sheet: 'marquee', cx: 878, cy: 0, cw: 866, ch: 1159, fx: 0.5, fy: 0.5 },
  },
  {
    id: 'plum-duffel-kit',
    title: 'Plum Fleece Set & Lilac Duffel',
    subtitle: 'Gym-to-Street Kit',
    category: 'MEN',
    tags: ['ALL', 'MEN', 'ACCESSORIES', 'SEASONAL'],
    colorway: 'Rich Plum / Lilac',
    priceCents: 22400,
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    description:
      'Heavyweight plum fleece zip set bundled with our quilted lilac studio duffel for seamless winter commutes.',
    fabricNote: '440 GSM fleece with water-repellent ripstop duffel shell.',
    image: { type: 'sheet', sheet: 'marquee', cx: 0, cy: 1172, cw: 866, ch: 1164, fx: 0.5, fy: 0.5 },
  },
  {
    id: 'orchid-crop-leggings',
    title: 'Orchid Cropped Zip & Legging',
    subtitle: 'Sculpt Studio Set',
    category: 'WOMEN',
    tags: ['ALL', 'WOMEN', 'SEASONAL'],
    colorway: 'Vibrant Orchid',
    priceCents: 16400,
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    description:
      'Cropped funnel-neck knit zip layer paired with high-compression winter leggings for high-output indoor and outdoor workouts.',
    fabricNote: 'Brushed interlock knit with matte compression support.',
    image: { type: 'sheet', sheet: 'marquee', cx: 878, cy: 1172, cw: 866, ch: 1164, fx: 0.5, fy: 0.5 },
  },
  {
    id: 'cable-knit-quarter-zip-ivory',
    title: 'Cable-Knit Quarter-Zip Sweater',
    subtitle: 'Heritage Winter Knit',
    category: 'MEN',
    tags: ['ALL', 'MEN', 'SEASONAL', 'TRENDING'],
    colorway: 'Ivory Cream',
    priceCents: 22500,
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    description:
      'Signature cable-knit quarter-zip sweater with a high mock neck and ribbed cuffs built for brisk morning commutes and post-training layering.',
    fabricNote: '100% combed cotton heavy-gauge cable knit.',
    image: { type: 'sheet', sheet: 'cable_men_cream', cx: 481, cy: 217, cw: 389, ch: 481, fx: 0.5, fy: 0.25 },
  },
  {
    id: 'cable-cashmere-crewneck-pine',
    title: 'Iconic Cable-Knit Cashmere Sweater',
    subtitle: 'Fine Cashmere Crewneck',
    category: 'MEN',
    tags: ['ALL', 'MEN', 'SEASONAL'],
    colorway: 'Forest Green',
    priceCents: 24500,
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    description:
      'Classic cable-knit crewneck sweater crafted in lofty forest green yarn for structured warmth without heavy bulk.',
    fabricNote: 'Italian wool-cashmere cable knit blend.',
    image: { type: 'sheet', sheet: 'cable_men_cream', cx: 84, cy: 217, cw: 390, ch: 481, fx: 0.5, fy: 0.25 },
  },
  {
    id: 'cable-turtleneck-espresso',
    title: 'Cable-Knit Wool-Cashmere Turtleneck',
    subtitle: 'Cold-Weather Layer',
    category: 'MEN',
    tags: ['ALL', 'MEN', 'TRENDING'],
    colorway: 'Espresso Olive',
    priceCents: 26800,
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    description:
      'Relaxed folded turtleneck in deep espresso wool-cashmere cable stitch designed to seal warmth on freezing winter evenings.',
    fabricNote: '90% merino wool, 10% brushed cashmere.',
    image: { type: 'sheet', sheet: 'cable_men_espresso', cx: 481, cy: 200, cw: 389, ch: 491, fx: 0.5, fy: 0.2 },
  },
  {
    id: 'cable-collared-cardigan-pine',
    title: 'Cable Wool-Cashmere Collared Cardigan',
    subtitle: 'Buttoned Knit Layer',
    category: 'WOMEN',
    tags: ['ALL', 'WOMEN', 'SEASONAL', 'TRENDING'],
    colorway: 'Deep Forest Green',
    priceCents: 26800,
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    description:
      'Wide-collared button cardigan featuring heritage cable texture and horn-tone buttons for effortless studio-to-street transitions.',
    fabricNote: 'Plush wool-cashmere cable blend with ribbed hem.',
    image: { type: 'sheet', sheet: 'cable_women_green', cx: 84, cy: 199, cw: 390, ch: 492, fx: 0.5, fy: 0.2 },
  },
  {
    id: 'cable-half-zip-ivory',
    title: 'Cable Wool-Cashmere Half-Zip Sweater',
    subtitle: 'Plush Funnel Knit',
    category: 'WOMEN',
    tags: ['ALL', 'WOMEN', 'TRENDING', 'SEASONAL'],
    colorway: 'Warm Cream',
    priceCents: 29800,
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    description:
      'Cropped boxy half-zip sweater knitted in plush ivory cable yarn with a tall zip collar and dropped shoulders.',
    fabricNote: 'Superfine wool-cashmere lofty cable stitch.',
    image: { type: 'sheet', sheet: 'cable_women_cream', cx: 481, cy: 184, cw: 389, ch: 491, fx: 0.5, fy: 0.2 },
  },
  {
    id: 'cable-snapped-jacket-grey',
    title: 'Cable-Knit Wool-Cashmere Snapped Jacket',
    subtitle: 'Cropped Knit Outerwear',
    category: 'WOMEN',
    tags: ['ALL', 'WOMEN', 'SEASONAL'],
    colorway: 'Heather Grey',
    priceCents: 29500,
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    description:
      'Structured bomber-silhouette snapped cardigan jacket in heather grey cable knit built for crisp morning warm-ups.',
    fabricNote: 'Heavyweight wool-cashmere double-knit.',
    image: { type: 'sheet', sheet: 'cable_women_cream', cx: 877, cy: 184, cw: 390, ch: 491, fx: 0.5, fy: 0.2 },
  },
  {
    id: 'hanley-cable-throw-blanket',
    title: 'Hanley Cable-Knit Throw Blanket',
    subtitle: 'Recovery & Studio Home',
    category: 'SEASONAL',
    tags: ['ALL', 'SEASONAL', 'ACCESSORIES'],
    colorway: 'Cobalt Blue',
    priceCents: 22049,
    msrpCents: 27500,
    sizes: ['OS'],
    description:
      'Oversized heavyweight cable-knit throw blanket spun from soft combed cotton for post-workout recovery and cold-weather lounging.',
    fabricNote: '100% combed cotton jumbo cable weave.',
    image: { type: 'sheet', sheet: 'cable_blanket', cx: 84, cy: 153, cw: 390, ch: 489, fx: 0.5, fy: 0.5 },
  },
  {
    id: 'hanley-cable-throw-pillow',
    title: 'Hanley Cable-Knit Throw Pillow',
    subtitle: 'Plum Cable Home Accent',
    category: 'ACCESSORIES',
    tags: ['ALL', 'ACCESSORIES', 'SEASONAL'],
    colorway: 'Royal Plum',
    priceCents: 14049,
    msrpCents: 17500,
    sizes: ['OS'],
    description:
      'Matching royal plum cable-knit square pillow crafted to pair with our seasonal knitwear drops and recovery space.',
    fabricNote: '100% combed cotton knit cover with feather insert.',
    image: { type: 'sheet', sheet: 'cable_pillow', cx: 877, cy: 221, cw: 390, ch: 418, fx: 0.5, fy: 0.5 },
  },
  {
    id: 'cable-knit-cotton-cardigan-grey',
    title: 'Cable-Knit Cotton Cardigan',
    subtitle: 'Collared Knit Cardigan',
    category: 'MEN',
    tags: ['ALL', 'MEN', 'SEASONAL'],
    colorway: 'Heather Grey',
    priceCents: 19800,
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    description:
      'Collared cable-knit cotton cardigan with tonal buttons and patch pockets built for smart cold-weather layering.',
    fabricNote: '100% combed cotton textured cable knit.',
    image: { type: 'sheet', sheet: 'cable_men_espresso', cx: 84, cy: 200, cw: 390, ch: 491, fx: 0.5, fy: 0.2 },
  },
  {
    id: 'cable-wool-cashmere-cardigan-oat',
    title: 'Cable-Knit Wool-Cashmere Cardigan',
    subtitle: 'Tailored Winter Cardigan',
    category: 'MEN',
    tags: ['ALL', 'MEN', 'TRENDING'],
    colorway: 'Oatmeal Taupe',
    priceCents: 26800,
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    description:
      'Open-placket V-neck wool-cashmere cardigan knitted in refined oatmeal cable stitch for warm everyday layering.',
    fabricNote: '90% superfine wool, 10% brushed cashmere.',
    image: { type: 'sheet', sheet: 'cable_men_espresso', cx: 877, cy: 200, cw: 390, ch: 491, fx: 0.5, fy: 0.2 },
  },
  {
    id: 'cable-wool-cashmere-sweater-red',
    title: 'Cable-Knit Wool-Cashmere Sweater',
    subtitle: 'Holiday Crimson Knit',
    category: 'MEN',
    tags: ['ALL', 'MEN', 'SEASONAL', 'TRENDING'],
    colorway: 'Crimson Red',
    priceCents: 24500,
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    description:
      'Vibrant crimson crewneck sweater in heritage cable texture designed to stand out over crisp winter shirting.',
    fabricNote: 'Italian wool-cashmere cable blend.',
    image: { type: 'sheet', sheet: 'cable_men_cream', cx: 877, cy: 217, cw: 390, ch: 481, fx: 0.5, fy: 0.2 },
  },
  {
    id: 'cable-cotton-half-zip-navy',
    title: 'Cable-Knit Cotton Half-Zip Sweater',
    subtitle: 'Mock-Neck Zip Pullover',
    category: 'WOMEN',
    tags: ['ALL', 'WOMEN', 'SEASONAL', 'TRENDING'],
    colorway: 'Deep Navy',
    priceCents: 18800,
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    description:
      'Relaxed deep navy cotton cable sweater with a metal ring zipper pull and ribbed trim for effortless studio layering.',
    fabricNote: '100% breathable combed cotton cable knit.',
    image: { type: 'sheet', sheet: 'cable_women_green', cx: 481, cy: 199, cw: 389, ch: 492, fx: 0.5, fy: 0.2 },
  },
  {
    id: 'iconic-cable-cashmere-red',
    title: 'The Iconic Cable-Knit Cashmere Sweater',
    subtitle: 'Pure Cashmere Pullover',
    category: 'WOMEN',
    tags: ['ALL', 'WOMEN', 'TRENDING'],
    colorway: 'Scarlet Red',
    priceCents: 29800,
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    description:
      'Signature slim-cut cable sweater spun from ultra-soft scarlet cashmere for featherweight warmth.',
    fabricNote: '100% pure two-ply cashmere.',
    image: { type: 'sheet', sheet: 'cable_women_green', cx: 877, cy: 199, cw: 390, ch: 492, fx: 0.5, fy: 0.2 },
  },
  {
    id: 'cable-wool-cashmere-cardigan-red',
    title: 'Cable-Knit Wool-Cashmere Cardigan',
    subtitle: 'Cropped Button Cardigan',
    category: 'WOMEN',
    tags: ['ALL', 'WOMEN', 'SEASONAL'],
    colorway: 'Crimson Red',
    priceCents: 26800,
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    description:
      'Vibrant crimson wool-cashmere button cardigan with sculpted ribbed cuffs and tonal front closure.',
    fabricNote: 'Lofty wool-cashmere cable stitch.',
    image: { type: 'sheet', sheet: 'cable_women_cream', cx: 84, cy: 184, cw: 390, ch: 491, fx: 0.5, fy: 0.2 },
  },
  {
    id: 'embroidered-cotton-cricket-sweater',
    title: 'Embroidered Cotton Cricket Sweater',
    subtitle: 'Varsity Stripe V-Neck',
    category: 'SEASONAL',
    tags: ['ALL', 'SEASONAL', 'TRENDING'],
    colorway: 'Black & Crimson',
    priceCents: 13099,
    msrpCents: 18500,
    sizes: ['XS', 'S', 'M', 'L'],
    description:
      'Heritage V-neck cable cricket sweater accented with bold crimson stripes and crest embroidery.',
    fabricNote: '100% heavyweight combed cotton.',
    image: { type: 'sheet', sheet: 'cable_kids_cricket', cx: 84, cy: 153, cw: 390, ch: 484, fx: 0.5, fy: 0.2 },
  },
  {
    id: 'cable-cotton-quarter-zip-navy',
    title: 'Cable-Knit Cotton Quarter-Zip Pullover',
    subtitle: 'Youth Studio Layer',
    category: 'SEASONAL',
    tags: ['ALL', 'SEASONAL', 'MEN'],
    colorway: 'Midnight Navy',
    priceCents: 5999,
    msrpCents: 7950,
    sizes: ['XS', 'S', 'M', 'L'],
    description:
      'Classic midnight navy cable quarter-zip with crimson pony embroidery and ribbed collar for cold-weather warm-ups.',
    fabricNote: '100% machine-washable combed cotton.',
    image: { type: 'sheet', sheet: 'cable_kids_cricket', cx: 481, cy: 153, cw: 389, ch: 484, fx: 0.5, fy: 0.2 },
  },
  {
    id: 'plaid-trim-cable-cardigan',
    title: 'Plaid-Trim Cable Cotton Cardigan',
    subtitle: 'Holiday Tartan Trim',
    category: 'SEASONAL',
    tags: ['ALL', 'SEASONAL', 'TRENDING'],
    colorway: 'Black & Tartan Red',
    priceCents: 7950,
    msrpCents: 7950,
    sizes: ['XS', 'S', 'M', 'L'],
    description:
      'Black cable-knit V-neck cardigan framed with seasonal red tartan plaid trim along the button placket.',
    fabricNote: '100% combed cotton knit with woven tartan placket.',
    image: { type: 'sheet', sheet: 'cable_kids_cricket', cx: 877, cy: 153, cw: 390, ch: 484, fx: 0.5, fy: 0.2 },
  },
  {
    id: 'cable-cotton-cardigan-espresso',
    title: 'Cable-Knit Cotton Crew Cardigan',
    subtitle: 'Pearl-Button Knit',
    category: 'SEASONAL',
    tags: ['ALL', 'SEASONAL', 'WOMEN'],
    colorway: 'Espresso Brown',
    priceCents: 6399,
    msrpCents: 8500,
    sizes: ['XS', 'S', 'M', 'L'],
    description:
      'Rich espresso cable-knit crewneck cardigan finished with luminous pearlized buttons and scalloped ribbed trim.',
    fabricNote: '100% soft-spun combed cotton.',
    image: { type: 'sheet', sheet: 'cable_kids_cardigans', cx: 84, cy: 153, cw: 390, ch: 409, fx: 0.5, fy: 0.35 },
  },
  {
    id: 'mini-cable-bear-cardigan-pine',
    title: 'Polo Bear Mini-Cable Cotton Cardigan',
    subtitle: 'Embroidered Heritage Knit',
    category: 'SEASONAL',
    tags: ['ALL', 'SEASONAL', 'TRENDING'],
    colorway: 'Forest Green',
    priceCents: 7500,
    msrpCents: 7500,
    sizes: ['XS', 'S', 'M', 'L'],
    description:
      'Fine mini-cable pine green cotton cardigan featuring signature bear chest embroidery and gold-tone buttons.',
    fabricNote: '100% combed cotton fine cable weave.',
    image: { type: 'sheet', sheet: 'cable_kids_cardigans', cx: 481, cy: 153, cw: 389, ch: 409, fx: 0.5, fy: 0.35 },
  },
  {
    id: 'cable-cotton-sweater-black',
    title: 'Cable-Knit Cotton Crewneck Sweater',
    subtitle: 'Everyday Black Cable',
    category: 'SEASONAL',
    tags: ['ALL', 'SEASONAL', 'TRENDING'],
    colorway: 'Jet Black',
    priceCents: 5199,
    msrpCents: 6950,
    sizes: ['XS', 'S', 'M', 'L'],
    description:
      'Clean jet black cable-knit cotton crewneck with subtle crimson chest embroidery built for versatile cold-day layering.',
    fabricNote: '100% combed cotton breathable cable stitch.',
    image: { type: 'sheet', sheet: 'cable_kids_cardigans', cx: 877, cy: 153, cw: 390, ch: 409, fx: 0.5, fy: 0.25 },
  },
  {
    id: 'hanley-cable-throw-blanket-red',
    title: 'Hanley Cable-Knit Throw Blanket',
    subtitle: 'Crimson Recovery Throw',
    category: 'ACCESSORIES',
    tags: ['ALL', 'ACCESSORIES', 'SEASONAL'],
    colorway: 'Crimson Red',
    priceCents: 22049,
    msrpCents: 27500,
    sizes: ['OS'],
    description:
      'Heavy-gauge crimson cable-knit throw blanket knitted from pure combed cotton for studio lounges and cold evenings.',
    fabricNote: '100% combed cotton jumbo cable weave.',
    image: { type: 'sheet', sheet: 'cable_blanket', cx: 481, cy: 153, cw: 389, ch: 489, fx: 0.5, fy: 0.5 },
  },
  {
    id: 'hanley-cable-throw-blanket-green',
    title: 'Hanley Cable-Knit Throw Blanket',
    subtitle: 'Evergreen Recovery Throw',
    category: 'ACCESSORIES',
    tags: ['ALL', 'ACCESSORIES', 'SEASONAL'],
    colorway: 'Forest Green',
    priceCents: 22049,
    msrpCents: 27500,
    sizes: ['OS'],
    description:
      'Deep forest green cable-knit cotton throw blanket featuring classic ribbed borders and tonal stitch texture.',
    fabricNote: '100% combed cotton jumbo cable weave.',
    image: { type: 'sheet', sheet: 'cable_blanket', cx: 877, cy: 153, cw: 390, ch: 489, fx: 0.5, fy: 0.5 },
  },
  {
    id: 'hanley-cable-throw-pillow-red',
    title: 'Hanley Cable-Knit Throw Pillow',
    subtitle: 'Crimson Home Accent',
    category: 'ACCESSORIES',
    tags: ['ALL', 'ACCESSORIES', 'SEASONAL'],
    colorway: 'Crimson Red',
    priceCents: 14049,
    msrpCents: 17500,
    sizes: ['OS'],
    description:
      'Vibrant crimson square cable-knit cushion crafted in soft combed cotton to elevate any recovery space.',
    fabricNote: '100% combed cotton cover with feather insert.',
    image: { type: 'sheet', sheet: 'cable_pillow', cx: 84, cy: 221, cw: 390, ch: 418, fx: 0.5, fy: 0.5 },
  },
  {
    id: 'hanley-cable-throw-pillow-green',
    title: 'Hanley Cable-Knit Throw Pillow',
    subtitle: 'Evergreen Home Accent',
    category: 'ACCESSORIES',
    tags: ['ALL', 'ACCESSORIES', 'SEASONAL'],
    colorway: 'Forest Green',
    priceCents: 14049,
    msrpCents: 17500,
    sizes: ['OS'],
    description:
      'Rich forest green square cable-knit pillow featuring signature embroidery and ribbed knit edges.',
    fabricNote: '100% combed cotton cover with feather insert.',
    image: { type: 'sheet', sheet: 'cable_pillow', cx: 481, cy: 221, cw: 389, ch: 418, fx: 0.5, fy: 0.5 },
  },
];

export const LOOKBOOK_FRAMES: {
  id: string;
  productId: string;
  label: string;
  caption: string;
  image: SheetCrop;
}[] = [
  {
    id: 'reel-1',
    productId: 'winter-capsule-pack',
    label: '01 / ORCHID WINTER DROP',
    caption: 'Three athletes in coordinated lilac, orchid, and plum studio knit sets built for cold starts.',
    image: { type: 'sheet', sheet: 'collage', cx: 1036, cy: 1036, cw: 982, ch: 983, fx: 0.5, fy: 0.55 },
  },
  {
    id: 'reel-2',
    productId: 'orchid-funnel-profile',
    label: '02 / FUNNEL COLLAR ARCHITECTURE',
    caption: 'Structured tall rib collar shields against wind while staying breathable through heavy sets.',
    image: { type: 'sheet', sheet: 'collage', cx: 29, cy: 28, cw: 982, ch: 982, fx: 0.5, fy: 0.25 },
  },
  {
    id: 'reel-3',
    productId: 'lilac-fleece-set',
    label: '03 / BRUSHED FLEECE MOVEMENT',
    caption: 'Dropped shoulders and relaxed cuffs engineered to move cleanly with every rep.',
    image: { type: 'sheet', sheet: 'collage', cx: 1036, cy: 28, cw: 982, ch: 982, fx: 0.5, fy: 0.35 },
  },
  {
    id: 'reel-4',
    productId: 'plum-fingerless-gloves',
    label: '04 / COLD-RUN DETAILS',
    caption: 'Fingerless ribbed lilac wrist warmers keep palms free for bars, kettlebells, and wraps.',
    image: { type: 'sheet', sheet: 'collage', cx: 29, cy: 1036, cw: 982, ch: 982, fx: 0.5, fy: 0.45 },
  },
];

export function isProductOnSale(
  product: Pick<Product, 'priceCents' | 'msrpCents'>
): boolean {
  return typeof product.msrpCents === 'number' && product.msrpCents > product.priceCents;
}

export function getProductById(productId: string): Product | undefined {
  return PRODUCTS.find((p) => p.id === productId);
}

export function buildProductShareUrl(productId: string, baseHref: string): string {
  try {
    const url = new URL(baseHref);
    url.search = '';
    url.hash = '';
    url.searchParams.set('product', productId);
    return url.toString();
  } catch {
    return `?product=${encodeURIComponent(productId)}`;
  }
}

export function parseProductShareParam(search: string): Product | undefined {
  const params = new URLSearchParams(search);
  const raw = params.get('product');
  if (!raw) return undefined;
  return getProductById(raw.trim());
}

export function filterProductsByCategory(category: CategoryId): Product[] {
  if (category === 'ALL') return PRODUCTS;
  return PRODUCTS.filter((p) => p.tags.includes(category));
}

export function filterCatalogProducts(category: CategoryId, searchQuery: string): Product[] {
  const byCategory = filterProductsByCategory(category);
  const q = searchQuery.trim().toLowerCase();
  if (!q) return byCategory;
  return byCategory.filter((p) => p.title.toLowerCase().includes(q));
}

export function makeCartItemId(productId: string, size: SizeCode): string {
  const safeId = `${productId}__${size}`.replace(/[^a-zA-Z0-9_-]/g, '_');
  return safeId.slice(0, 128);
}

export function formatPrice(cents: number): string {
  const dollars = cents / 100;
  return Number.isInteger(dollars) ? `$${dollars}` : `$${dollars.toFixed(2)}`;
}

export function computeBagTotals(items: CartItemData[]): {
  itemsCount: number;
  subtotalCents: number;
  formattedSubtotal: string;
} {
  let itemsCount = 0;
  let subtotalCents = 0;
  for (const item of items) {
    const qty = Math.max(0, Math.min(20, Math.floor(item.quantity)));
    itemsCount += qty;
    subtotalCents += item.priceCents * qty;
  }
  return {
    itemsCount,
    subtotalCents,
    formattedSubtotal: formatPrice(subtotalCents),
  };
}

export function validateOrderInput(input: {
  shippingAddress: string;
  items: CartItemData[];
}): { ok: true; sanitizedAddress: string; orderItems: OrderItemPayload[] } | { ok: false; error: string } {
  const trimmed = input.shippingAddress.trim();
  if (trimmed.length < 5 || trimmed.length > 240) {
    return { ok: false, error: 'Please enter a shipping address between 5 and 240 characters.' };
  }
  if (!input.items.length) {
    return { ok: false, error: 'Your bag is empty.' };
  }
  if (input.items.length > 20) {
    return { ok: false, error: 'Orders are limited to 20 distinct line items at once.' };
  }
  const orderItems: OrderItemPayload[] = input.items.map((item) => ({
    productId: item.productId.slice(0, 64),
    title: item.title.slice(0, 120),
    size: item.size,
    priceCents: Math.max(100, Math.min(500000, Math.round(item.priceCents))),
    quantity: Math.max(1, Math.min(20, Math.round(item.quantity))),
  }));
  return { ok: true, sanitizedAddress: trimmed, orderItems };
}
