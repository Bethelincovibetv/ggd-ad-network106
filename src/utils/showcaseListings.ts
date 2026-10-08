export interface ShowcaseListing {
  id: string;
  title: string;
  description: string;
  long_description: string;
  price: number;
  image_url: string;
  extra_images?: string[];
  video_url?: string | null;
  listing_type: 'product' | 'service';
  is_featured: boolean;
  is_active: boolean;
  business_profile_id: string;
  category_id?: string;
  category_slug?: string;
  user_id?: string;
  created_at?: string;
  business_profiles: {
    id: string;
    business_name: string;
    logo_url: string;
    category_id?: string;
    is_directory_listed: boolean;
    address: string;
    state: string;
    phone_number?: string;
    whatsapp_link?: string;
    website_link?: string;
  };
}

export const SHOWCASE_PRODUCTS_AND_SERVICES: ShowcaseListing[] = [
  // TECHNOLOGY & ICT
  {
    id: 'ggd-prod-tech-01',
    title: '5G High-Speed Enterprise WiFi Router & Unlimited Data Gateway',
    description: 'Ultra-fast dual-band Wi-Fi 6 router optimized for Nigerian office networks and remote teams with lightning-fast speeds and failover SIM support.',
    long_description: 'Engineered for uninterrupted high-speed internet in Nigeria. Supports all major telecom networks (MTN 5G, Airtel 5G, Glo, 9mobile). Features 3000Mbps dual-band throughput, 6 high-gain antennas, Gigabit Ethernet ports, and an automated power-backup battery slot ensuring continuous connectivity during power fluctuations.',
    price: 68500,
    image_url: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?auto=format&fit=crop&w=800&q=80',
    extra_images: [
      'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=800&q=80'
    ],
    video_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    listing_type: 'product',
    is_featured: true,
    is_active: true,
    business_profile_id: 'biz-nextech-lagos',
    category_slug: 'technology',
    business_profiles: {
      id: 'biz-nextech-lagos',
      business_name: 'NexTech Systems Nigeria',
      logo_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=200&q=80',
      is_directory_listed: true,
      address: 'Plot 14, Otigba Street, Computer Village, Ikeja, Lagos',
      state: 'Lagos',
      phone_number: '+2348023456789',
      whatsapp_link: '2348023456789',
      website_link: 'https://goodgift.ng'
    }
  },
  {
    id: 'ggd-srv-tech-02',
    title: 'Custom Mobile App & Web Platform Development (iOS, Android & Web)',
    description: 'End-to-end bespoke mobile and web development for Nigerian fintechs, logistics, e-commerce, and corporate enterprises.',
    long_description: 'We design, build, and deploy production-grade software applications tailored for African markets. Includes modern UI/UX design, Paystack & Flutterwave integration, cloud hosting setup on AWS/GCP, automated WhatsApp notifications, and 6 months of dedicated post-launch support.',
    price: 350000,
    image_url: 'https://images.unsplash.com/photo-1551650975-87deedd944c3?auto=format&fit=crop&w=800&q=80',
    extra_images: [
      'https://images.unsplash.com/photo-1551650975-87deedd944c3?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=800&q=80'
    ],
    listing_type: 'service',
    is_featured: true,
    is_active: true,
    business_profile_id: 'biz-codecraft-solutions',
    category_slug: 'technology',
    business_profiles: {
      id: 'biz-codecraft-solutions',
      business_name: 'CodeCraft Digital Agency',
      logo_url: 'https://images.unsplash.com/photo-1572044162444-ad60f128bdea?auto=format&fit=crop&w=200&q=80',
      is_directory_listed: true,
      address: '24 Admiralty Way, Lekki Phase 1, Lagos',
      state: 'Lagos',
      phone_number: '+2348123456701',
      whatsapp_link: '2348123456701',
      website_link: 'https://goodgift.ng'
    }
  },

  // FASHION & APPAREL
  {
    id: 'ggd-prod-fashion-03',
    title: 'Luxury Hand-Embroidered Senator Agbada Suit Set (Royal Navy Blue)',
    description: 'Handcrafted premium wool cashmere senator native wear tailored with intricate golden embroidery for high-profile events and weddings.',
    long_description: 'Made from imported Italian Cashmere and Irish linen. Cut and tailored by master African craftsmen to your exact body measurements. Features breathable lining, double-stitch reinforcement, and matching hand-stitched trousers. Fast delivery across all 36 states in Nigeria and worldwide shipping.',
    price: 45000,
    image_url: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=800&q=80',
    extra_images: [
      'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?auto=format&fit=crop&w=800&q=80'
    ],
    listing_type: 'product',
    is_featured: true,
    is_active: true,
    business_profile_id: 'biz-habib-couture',
    category_slug: 'fashion',
    business_profiles: {
      id: 'biz-habib-couture',
      business_name: 'Habib Luxury Stitches & Couture',
      logo_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
      is_directory_listed: true,
      address: 'Suite 12, Garki Mall, Area 11, Garki, Abuja (FCT)',
      state: 'Abuja (FCT)',
      phone_number: '+2348034567890',
      whatsapp_link: '2348034567890'
    }
  },
  {
    id: 'ggd-srv-fashion-04',
    title: 'Bespoke Bridal Tailoring & Event Wardrobe Consultation',
    description: 'Custom bridal gown designing, bridesmaid dresses, traditional wedding aso-ebi styling, and red-carpet wardrobe consulting.',
    long_description: 'We bring your dream bridal look to life with master pattern making, custom lace applique, crystal beading, and flawless structural boning. Includes multiple fitting sessions, fabric sourcing assistance, and on-the-day dressing support for luxury weddings in Abuja, Lagos, and Port Harcourt.',
    price: 180000,
    image_url: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=800&q=80',
    listing_type: 'service',
    is_featured: false,
    is_active: true,
    business_profile_id: 'biz-habib-couture',
    category_slug: 'fashion',
    business_profiles: {
      id: 'biz-habib-couture',
      business_name: 'Habib Luxury Stitches & Couture',
      logo_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
      is_directory_listed: true,
      address: 'Suite 12, Garki Mall, Area 11, Garki, Abuja (FCT)',
      state: 'Abuja (FCT)',
      phone_number: '+2348034567890',
      whatsapp_link: '2348034567890'
    }
  },

  // SOLAR & RENEWABLE ENERGY
  {
    id: 'ggd-prod-solar-05',
    title: '5kVA / 48V Pure Sine Wave Hybrid Solar Inverter + 10kWh Lithium Battery',
    description: 'Zero-noise complete solar power solution for Nigerian homes and businesses. Powers ACs, refrigerators, TVs, lighting, and computers 24/7.',
    long_description: 'Designed for robust 24/7 electricity generation. Includes intelligent MPPT solar charge controller (100A), high-density Grade-A LiFePO4 battery pack with 10-year lifespan, smart Wi-Fi monitoring app, and surge protection. Professional installation by certified solar engineers across Nigeria.',
    price: 1850000,
    image_url: 'https://images.unsplash.com/photo-1509391365360-2e959784a276?auto=format&fit=crop&w=800&q=80',
    extra_images: [
      'https://images.unsplash.com/photo-1509391365360-2e959784a276?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1508873696983-2df5293cb32f?auto=format&fit=crop&w=800&q=80'
    ],
    listing_type: 'product',
    is_featured: true,
    is_active: true,
    business_profile_id: 'biz-sunwave-energy',
    category_slug: 'solar',
    business_profiles: {
      id: 'biz-sunwave-energy',
      business_name: 'SunWave Power & Solar Solutions',
      logo_url: 'https://images.unsplash.com/photo-1509391365360-2e959784a276?auto=format&fit=crop&w=200&q=80',
      is_directory_listed: true,
      address: 'KM 14, Lekki-Epe Expressway, Chevron Drive, Lagos',
      state: 'Lagos',
      phone_number: '+2348099887766',
      whatsapp_link: '2348099887766'
    }
  },
  {
    id: 'ggd-srv-solar-06',
    title: 'Commercial Solar System Audit, Sizing & Maintenance Service',
    description: 'Comprehensive electrical energy audit, inverter diagnostics, battery cell balancing, and scheduled maintenance for corporate sites.',
    long_description: 'Our team of certified renewable energy engineers inspects your building electrical load, tests solar panel degradation, tunes inverter firmware, and optimizes battery performance to slash your diesel/fuel bills by up to 85%. Available nationwide in Nigeria.',
    price: 75000,
    image_url: 'https://images.unsplash.com/photo-1508873696983-2df5293cb32f?auto=format&fit=crop&w=800&q=80',
    listing_type: 'service',
    is_featured: false,
    is_active: true,
    business_profile_id: 'biz-sunwave-energy',
    category_slug: 'solar',
    business_profiles: {
      id: 'biz-sunwave-energy',
      business_name: 'SunWave Power & Solar Solutions',
      logo_url: 'https://images.unsplash.com/photo-1509391365360-2e959784a276?auto=format&fit=crop&w=200&q=80',
      is_directory_listed: true,
      address: 'KM 14, Lekki-Epe Expressway, Chevron Drive, Lagos',
      state: 'Lagos',
      phone_number: '+2348099887766',
      whatsapp_link: '2348099887766'
    }
  },

  // REAL ESTATE & PROPERTIES
  {
    id: 'ggd-prod-real-07',
    title: '4-Bedroom Fully Detached Contemporary Smart Duplex with BQ',
    description: 'Brand new luxury home with automated lighting, fitted kitchen, private cinema room, swimming pool, and Governor’s Consent title.',
    long_description: 'Located in a gated high-security estate in Lekki. Features all en-suite bedrooms, Italian marble flooring, high-tech biometric security doors, solar inverter pre-wiring, 2-room boys quarters, and ample parking for 5 cars. Title: Governor’s Consent. Flexible payment plans available.',
    price: 165000000,
    image_url: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=80',
    extra_images: [
      'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80'
    ],
    listing_type: 'product',
    is_featured: true,
    is_active: true,
    business_profile_id: 'biz-apex-realty',
    category_slug: 'real-estate',
    business_profiles: {
      id: 'biz-apex-realty',
      business_name: 'Apex Prime Properties & Homes',
      logo_url: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=200&q=80',
      is_directory_listed: true,
      address: 'Block B, Primewater Gardens, Ikate, Lekki, Lagos',
      state: 'Lagos',
      phone_number: '+2348011223344',
      whatsapp_link: '2348011223344'
    }
  },
  {
    id: 'ggd-srv-real-08',
    title: 'Property Legal Verification, Land Title Search & Surveying',
    description: 'Comprehensive property title due diligence at the Lands Registry, C-of-O verification, boundary survey verification, and deed drafting.',
    long_description: 'Protect your real estate investment from fraud and government acquisition. Our accredited property legal team inspects records at the State Bureau of Lands, confirms cadastral mapping, checks for family disputes or pending litigation, and certifies land authenticity prior to purchase.',
    price: 95000,
    image_url: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=800&q=80',
    listing_type: 'service',
    is_featured: false,
    is_active: true,
    business_profile_id: 'biz-apex-realty',
    category_slug: 'real-estate',
    business_profiles: {
      id: 'biz-apex-realty',
      business_name: 'Apex Prime Properties & Homes',
      logo_url: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=200&q=80',
      is_directory_listed: true,
      address: 'Block B, Primewater Gardens, Ikate, Lekki, Lagos',
      state: 'Lagos',
      phone_number: '+2348011223344',
      whatsapp_link: '2348011223344'
    }
  },

  // FOOD & DINING
  {
    id: 'ggd-prod-food-09',
    title: 'Gourmet Party Jollof Rice & Crispy Smoked Chicken Platter (Catering Pack)',
    description: 'Authentic firewood-infused Nigerian party jollof rice prepared with premium long-grain rice, rich bell pepper blend, and tender seasoned chicken.',
    long_description: 'The definitive Nigerian party culinary experience. Prepared with signature natural spices, slow-smoked on seasoned hardwood, and served with fried sweet plantains (dodo) and zesty coleslaw. Serves 15–20 guests for corporate meetings, birthday celebrations, and family gatherings.',
    price: 38000,
    image_url: 'https://images.unsplash.com/photo-1567620832903-9fc6debc209f?auto=format&fit=crop&w=800&q=80',
    extra_images: [
      'https://images.unsplash.com/photo-1567620832903-9fc6debc209f?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=800&q=80'
    ],
    listing_type: 'product',
    is_featured: true,
    is_active: true,
    business_profile_id: 'biz-tasteville-kitchen',
    category_slug: 'food',
    business_profiles: {
      id: 'biz-tasteville-kitchen',
      business_name: 'TasteVille Continental & Native Kitchen',
      logo_url: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=200&q=80',
      is_directory_listed: true,
      address: 'Plot 78, Aminu Kano Crescent, Wuse 2, Abuja (FCT)',
      state: 'Abuja (FCT)',
      phone_number: '+2348087654321',
      whatsapp_link: '2348087654321'
    }
  },
  {
    id: 'ggd-srv-food-10',
    title: 'Full Corporate Event Catering & Live Grilling Stations',
    description: 'Exquisite event catering for AGMs, weddings, executive retreats, and private dining with live Asun, Shawarma, and Mocktail bars.',
    long_description: 'We deliver full culinary production for events of up to 1,000 guests across Nigeria. Complete with professional uniform servers, luxury chafing dishes, live barbecue stations (Asun, Suya, Grilled Fish), and custom dessert tables.',
    price: 250000,
    image_url: 'https://images.unsplash.com/photo-1555244162-803834f70033?auto=format&fit=crop&w=800&q=80',
    listing_type: 'service',
    is_featured: false,
    is_active: true,
    business_profile_id: 'biz-tasteville-kitchen',
    category_slug: 'food',
    business_profiles: {
      id: 'biz-tasteville-kitchen',
      business_name: 'TasteVille Continental & Native Kitchen',
      logo_url: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=200&q=80',
      is_directory_listed: true,
      address: 'Plot 78, Aminu Kano Crescent, Wuse 2, Abuja (FCT)',
      state: 'Abuja (FCT)',
      phone_number: '+2348087654321',
      whatsapp_link: '2348087654321'
    }
  },

  // HEALTH & WELLNESS
  {
    id: 'ggd-prod-health-11',
    title: 'Certified Digital Smart Health & Blood Pressure Bluetooth Monitor',
    description: 'Clinical accuracy upper-arm digital BP monitor with irregular heartbeat detection, OLED backlit screen, and phone app sync.',
    long_description: 'Recommended by Nigerian cardiologists. Features voice-guided measurement in English, memory storage for up to 180 readings across two users, WHO blood pressure classification indicator, and dual power (Type-C USB or AA batteries). Comes with 2-year warranty.',
    price: 24500,
    image_url: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=800&q=80',
    listing_type: 'product',
    is_featured: true,
    is_active: true,
    business_profile_id: 'biz-wellcare-pharmacy',
    category_slug: 'health',
    business_profiles: {
      id: 'biz-wellcare-pharmacy',
      business_name: 'WellCare Pharmacy & Health Mart',
      logo_url: 'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?auto=format&fit=crop&w=200&q=80',
      is_directory_listed: true,
      address: '15 Stadium Road, Port Harcourt, Rivers',
      state: 'Rivers',
      phone_number: '+2348045678912',
      whatsapp_link: '2348045678912'
    }
  },

  // LOGISTICS & TRANSPORT
  {
    id: 'ggd-srv-logistics-12',
    title: 'Interstate Express Cargo & Door-to-Door Courier Delivery Service',
    description: 'Fast, secure parcel dispatch and freight hauling connecting Lagos, Abuja, Port Harcourt, Ibadan, Kano, and all 36 states with real-time GPS tracking.',
    long_description: 'We handle e-commerce package fulfillment, sensitive document dispatch, and bulk pallet transport. Features doorstep pickup, tamper-proof packaging, SMS tracking alerts, goods-in-transit insurance, and 24 to 48 hours delivery SLA across major commercial zones.',
    price: 4500,
    image_url: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=800&q=80',
    listing_type: 'service',
    is_featured: true,
    is_active: true,
    business_profile_id: 'biz-swiftroute-logistics',
    category_slug: 'logistics',
    business_profiles: {
      id: 'biz-swiftroute-logistics',
      business_name: 'SwiftRoute Express Logistics',
      logo_url: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=200&q=80',
      is_directory_listed: true,
      address: 'Plot 3, Commercial Avenue, Yaba, Lagos',
      state: 'Lagos',
      phone_number: '+2348077665544',
      whatsapp_link: '2348077665544'
    }
  },

  // BEAUTY & COSMETICS
  {
    id: 'ggd-prod-beauty-13',
    title: 'Pure Organic Raw Shea Butter & Cold-Pressed Vitamin E Glowing Skin Oil',
    description: '100% natural unrefined whipped African shea butter infused with jojoba oil, argan oil, and vitamin E for glowing, nourished skin.',
    long_description: 'Handcrafted in Nigeria without artificial fragrances, parabens, or harsh chemicals. Deeply moisturizes dry skin, prevents stretch marks, repairs damaged hair, and locks in natural radiance. Suitable for all skin tones and children.',
    price: 8500,
    image_url: 'https://images.unsplash.com/photo-1608248597359-21b3074092b7?auto=format&fit=crop&w=800&q=80',
    listing_type: 'product',
    is_featured: false,
    is_active: true,
    business_profile_id: 'biz-zuri-organics',
    category_slug: 'beauty',
    business_profiles: {
      id: 'biz-zuri-organics',
      business_name: 'Zuri Organics Skincare & Spa',
      logo_url: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=200&q=80',
      is_directory_listed: true,
      address: 'Shop 8, Bodija Shopping Complex, Ibadan, Oyo',
      state: 'Oyo',
      phone_number: '+2348055443322',
      whatsapp_link: '2348055443322'
    }
  },

  // AUTOMOTIVE & REPAIRS
  {
    id: 'ggd-srv-auto-14',
    title: 'Comprehensive Vehicle Computerized Diagnostic & Hybrid Battery Service',
    description: 'Full computerized engine scanning, automatic transmission service, hybrid battery regeneration, and AC system recharging.',
    long_description: 'State-of-the-art auto diagnostics utilizing genuine OEM scan tools for Toyota, Honda, Mercedes-Benz, BMW, Lexus, and Ford. We diagnose check engine lights, ABS faults, transmission hesitation, and offer written health inspection reports for car buyers in Lagos and Abuja.',
    price: 25000,
    image_url: 'https://images.unsplash.com/photo-1486006920555-c77dce18193b?auto=format&fit=crop&w=800&q=80',
    listing_type: 'service',
    is_featured: false,
    is_active: true,
    business_profile_id: 'biz-autotrek-care',
    category_slug: 'automotive',
    business_profiles: {
      id: 'biz-autotrek-care',
      business_name: 'AutoTrek Engineering & Diagnostics',
      logo_url: 'https://images.unsplash.com/photo-1486006920555-c77dce18193b?auto=format&fit=crop&w=200&q=80',
      is_directory_listed: true,
      address: '28 Kudirat Abiola Way, Oregun, Ikeja, Lagos',
      state: 'Lagos',
      phone_number: '+2348066554433',
      whatsapp_link: '2348066554433'
    }
  },

  // AGRICULTURE & AGRO-ALLIED
  {
    id: 'ggd-prod-agro-15',
    title: '50kg Premium Stone-Free De-Stoned Nigerian Ofada & Parboiled Rice',
    description: 'Export-grade cleaned, sand-free and stone-free locally grown Nigerian rice packed with natural nutrients and delicious aroma.',
    long_description: 'Directly sourced from accredited farm cooperatives in Ogun and Kebbi states. Carefully processed with modern sorting machines to ensure 100% stone-free, hygienic grains. Perfect for families, food vendors, and wholesale distribution.',
    price: 72000,
    image_url: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=800&q=80',
    listing_type: 'product',
    is_featured: false,
    is_active: true,
    business_profile_id: 'biz-greenfields-farms',
    category_slug: 'agriculture',
    business_profiles: {
      id: 'biz-greenfields-farms',
      business_name: 'GreenFields Agro & Commodities',
      logo_url: 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=200&q=80',
      is_directory_listed: true,
      address: 'Km 5, Abeokuta-Sagamu Expressway, Abeokuta, Ogun',
      state: 'Ogun',
      phone_number: '+2348033221100',
      whatsapp_link: '2348033221100'
    }
  }
];

export const getShowcaseListingsByCategory = (categorySlugOrName: string) => {
  if (!categorySlugOrName || categorySlugOrName === 'all') return SHOWCASE_PRODUCTS_AND_SERVICES;
  const normalized = categorySlugOrName.toLowerCase().replace(/[^a-z0-9]+/g, '');
  return SHOWCASE_PRODUCTS_AND_SERVICES.filter(item => {
    const itemSlug = (item.category_slug || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
    return itemSlug.includes(normalized) || normalized.includes(itemSlug);
  });
};

export const getShowcaseListingById = (id: string): ShowcaseListing | undefined => {
  return SHOWCASE_PRODUCTS_AND_SERVICES.find(item => item.id === id);
};
