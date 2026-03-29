/**
 * AdCopyAgent — generates Meta and Google ad copy on demand
 * for dealership campaigns.
 *
 * Produces compliant ad copy for multiple campaign types including
 * new/used inventory, service, seasonal, conquest, and retention.
 * All outputs include Meta Special Ad Category: Credit compliance flags.
 *
 * Supports bilingual EN/FR with Quebec French conventions.
 */

import type {
  DealershipConfig,
  CampaignType,
  ComplianceFlag,
  CtaButton,
  MetaAdSet,
  GoogleAdSet,
  SocialPost,
  AdCopyVehicle,
  AdCopyOffer,
  AdCopyAudience,
} from "./types.js";

import {
  buildAdCopyPrompt,
  detectComplianceFlag,
  validateCharLimit,
  validateStyleRules,
  META_PRIMARY_TEXT_MAX_CHARS,
  META_HEADLINE_MAX_CHARS,
  META_DESCRIPTION_MAX_CHARS,
  GOOGLE_HEADLINE_MAX_CHARS,
  GOOGLE_DESCRIPTION_MAX_CHARS,
} from "./prompts/ad-copy.js";

// --- Dependency Interfaces ---

export interface AdCopyInventoryServiceDep {
  getVehicleDetails(vin: string): Promise<AdCopyVehicle | null>;
  getInventoryCount(make?: string, model?: string): Promise<number>;
}

// --- Template Library ---

interface MetaTemplate {
  primaryText: string;
  headline: string;
  description: string;
  ctaButton: CtaButton;
  imageGuidance: string;
}

interface GoogleTemplate {
  headlines: string[];
  descriptions: string[];
  displayUrlPath: string;
  sitelinkExtensions: string[];
}

// --- English Meta Templates ---

const META_TEMPLATES_EN: Record<CampaignType, MetaTemplate[]> = {
  new_inventory: [
    {
      primaryText: "New {{year}} {{make}} {{model}} just arrived in {{city}}. Flexible financing options available. Apply today.",
      headline: "New {{make}} {{model}} — In Stock Now",
      description: "Apply now — quick approval",
      ctaButton: "Get Offer",
      imageGuidance: "Clean photo of the specific new vehicle on the lot. Bright lighting, dealership branding visible.",
    },
    {
      primaryText: "Join 500+ drivers who found their perfect ride at {{dealer}}. The {{year}} {{make}} {{model}} is waiting for you.",
      headline: "{{year}} {{make}} {{model}} — {{city}}",
      description: "See your rate in 60 seconds",
      ctaButton: "Learn More",
      imageGuidance: "Vehicle in a lifestyle setting. Customer handshake or key handoff moment.",
    },
    {
      primaryText: "Save thousands on the {{year}} {{make}} {{model}}. Limited-time financing offers. See if you qualify in 60 seconds.",
      headline: "Drive This {{make}} {{model}} Today",
      description: "$0 down options available",
      ctaButton: "Get Offer",
      imageGuidance: "Vehicle with payment overlay graphic. Bold, clean design with dealership logo.",
    },
  ],
  used_inventory: [
    {
      primaryText: "This {{year}} {{make}} {{model}} is available now in {{city}}. Flexible financing for every situation. Apply today.",
      headline: "{{year}} {{make}} {{model}} — {{km}} km",
      description: "From ${{weekly}}/week",
      ctaButton: "Get Offer",
      imageGuidance: "Real dealership photo of the vehicle. Natural lighting, no heavy filters.",
    },
    {
      primaryText: "Looking for a reliable {{make}} {{model}}? We have this {{year}} in stock. Same-day approval possible.",
      headline: "{{make}} {{model}} — Financing Available",
      description: "Apply now — quick approval",
      ctaButton: "Apply Now",
      imageGuidance: "Vehicle with a 'just arrived' banner. Professional but authentic dealership setting.",
    },
    {
      primaryText: "Your next car is here. {{year}} {{make}} {{model}} with flexible payment plans. See if you qualify — takes 60 seconds.",
      headline: "{{year}} {{make}} — From ${{price}}/mo",
      description: "Financing for every situation",
      ctaButton: "Get Offer",
      imageGuidance: "Split image showing vehicle exterior and interior highlights. Monthly payment overlay.",
    },
  ],
  service: [
    {
      primaryText: "Book your service appointment at {{dealer}} today. Factory-trained technicians. Quick turnaround.",
      headline: "Service at {{dealer}} — Book Now",
      description: "Expert service you can trust",
      ctaButton: "Book Now",
      imageGuidance: "Clean service bay photo. Technician working on vehicle. Professional, trustworthy.",
    },
    {
      primaryText: "Your {{make}} deserves the best care. {{dealer}} offers certified service with genuine parts. Book online.",
      headline: "Certified {{make}} Service — {{city}}",
      description: "Book your appointment today",
      ctaButton: "Book Now",
      imageGuidance: "Close-up of technician performing service. Dealership branding. Warm, professional tone.",
    },
    {
      primaryText: "Over 300 happy customers serviced this month at {{dealer}}. Join them — book your appointment in seconds.",
      headline: "Trusted Service — {{dealer}}",
      description: "Quick, reliable, fair pricing",
      ctaButton: "Book Now",
      imageGuidance: "Happy customer receiving keys back after service. Clean, modern service center.",
    },
  ],
  seasonal: [
    {
      primaryText: "This weekend only at {{dealer}}: special financing on select vehicles. Don't miss out — apply in 60 seconds.",
      headline: "Weekend Event — {{dealer}}",
      description: "This weekend only",
      ctaButton: "Get Offer",
      imageGuidance: "Event-style graphic with bold typography. Weekend dates prominently displayed. Vehicle lineup.",
    },
    {
      primaryText: "{{dealer}}'s seasonal clearance is on. Hundreds of vehicles must go. Flexible financing for every situation.",
      headline: "Seasonal Clearance — Save Now",
      description: "Limited time — apply today",
      ctaButton: "Shop Now",
      imageGuidance: "Lot full of vehicles with seasonal sale banners. Bold 'CLEARANCE' typography, not ALL CAPS.",
    },
    {
      primaryText: "Join hundreds of drivers who saved big during our seasonal event. Your turn — see your financing options today.",
      headline: "Don't Miss Our Sale — {{city}}",
      description: "Financing options available",
      ctaButton: "Get Offer",
      imageGuidance: "Happy customer driving away. Seasonal theme (snow/spring/summer). Dealership branding.",
    },
  ],
  conquest: [
    {
      primaryText: "Thinking about a new dealership? {{dealer}} has 200+ vehicles and 20+ lenders. See what you qualify for.",
      headline: "More Selection at {{dealer}}",
      description: "20+ lenders competing for you",
      ctaButton: "Get Offer",
      imageGuidance: "Wide shot of vehicle inventory. Clean, professional dealership. Emphasis on selection and scale.",
    },
    {
      primaryText: "Why settle? {{dealer}} offers more lenders, more vehicles, and faster approvals. Apply in 60 seconds.",
      headline: "Switch to {{dealer}} — {{city}}",
      description: "Apply now — 60 seconds",
      ctaButton: "Apply Now",
      imageGuidance: "Comparison-style graphic showing key advantages. Professional, not aggressive. No competitor logos.",
    },
    {
      primaryText: "Over 200 vehicles in stock. 20+ lending partners. Same-day approvals available at {{dealer}} in {{city}}.",
      headline: "{{dealer}} — More Options for You",
      description: "See your options today",
      ctaButton: "Learn More",
      imageGuidance: "Aerial or wide-angle lot shot. Impressive inventory display. Trust-building design.",
    },
  ],
  retention: [
    {
      primaryText: "It's time for an upgrade. As a valued {{dealer}} customer, you get priority access to new arrivals and special rates.",
      headline: "Upgrade Your Ride — {{dealer}}",
      description: "Exclusive offers for you",
      ctaButton: "Get Offer",
      imageGuidance: "Customer relationship moment. Side-by-side of current and upgrade vehicle. VIP feel.",
    },
    {
      primaryText: "Your trade-in value has never been higher. {{dealer}} is offering top dollar on your current vehicle. See your value.",
      headline: "Your Trade Is Worth More Now",
      description: "Get your trade-in value",
      ctaButton: "Get Offer",
      imageGuidance: "Trade-in valuation graphic. Arrow pointing up on value. Clean, modern design.",
    },
    {
      primaryText: "Thank you for being a {{dealer}} customer. Book your next service and enjoy our loyalty perks. We appreciate you.",
      headline: "Loyalty Perks at {{dealer}}",
      description: "Book service — save more",
      ctaButton: "Book Now",
      imageGuidance: "Warm, appreciative imagery. Handshake or thank-you card with vehicle. Loyalty badge.",
    },
  ],
};

// --- French Meta Templates ---

const META_TEMPLATES_FR: Record<CampaignType, MetaTemplate[]> = {
  new_inventory: [
    {
      primaryText: "Nouveau {{year}} {{make}} {{model}} arrive a {{city}}. Options de financement flexibles. Faites votre demande.",
      headline: "Nouveau {{make}} {{model}} — En stock",
      description: "Demande rapide — approbation",
      ctaButton: "Get Offer",
      imageGuidance: "Photo du vehicule neuf sur le terrain. Eclairage naturel, marque du concessionnaire visible.",
    },
    {
      primaryText: "Plus de 500 conducteurs ont trouve leur vehicule chez {{dealer}}. Le {{year}} {{make}} {{model}} vous attend.",
      headline: "{{year}} {{make}} {{model}} — {{city}}",
      description: "Votre taux en 60 secondes",
      ctaButton: "Learn More",
      imageGuidance: "Vehicule en contexte. Moment de remise des cles. Ambiance chaleureuse.",
    },
    {
      primaryText: "Economisez sur le {{year}} {{make}} {{model}}. Offres de financement a duree limitee. Decouvrez vos options.",
      headline: "Roulez en {{make}} {{model}} aujourd'hui",
      description: "0$ de mise de fonds dispo",
      ctaButton: "Get Offer",
      imageGuidance: "Vehicule avec graphique de paiement. Design audacieux et propre avec logo du concessionnaire.",
    },
  ],
  used_inventory: [
    {
      primaryText: "Ce {{year}} {{make}} {{model}} est disponible a {{city}}. Financement flexible pour chaque situation. Appliquez.",
      headline: "{{year}} {{make}} {{model}} — {{km}} km",
      description: "A partir de {{weekly}}$/sem",
      ctaButton: "Get Offer",
      imageGuidance: "Photo reelle du vehicule au concessionnaire. Eclairage naturel.",
    },
    {
      primaryText: "Vous cherchez un {{make}} {{model}} fiable? On a ce {{year}} en inventaire. Approbation le jour meme possible.",
      headline: "{{make}} {{model}} — Financement dispo",
      description: "Demande rapide — approbation",
      ctaButton: "Apply Now",
      imageGuidance: "Vehicule avec banniere 'vient d'arriver'. Contexte authentique du concessionnaire.",
    },
    {
      primaryText: "Votre prochain vehicule est ici. {{year}} {{make}} {{model}} avec paiements flexibles. Decouvrez vos options.",
      headline: "{{year}} {{make}} — A partir de {{price}}$/mo",
      description: "Financement pour chaque situation",
      ctaButton: "Get Offer",
      imageGuidance: "Image du vehicule avec paiement mensuel affiche. Design professionnel.",
    },
  ],
  service: [
    {
      primaryText: "Reservez votre rendez-vous de service chez {{dealer}}. Techniciens certifies. Service rapide.",
      headline: "Service chez {{dealer}} — Reservez",
      description: "Service expert de confiance",
      ctaButton: "Book Now",
      imageGuidance: "Photo de la baie de service. Technicien au travail. Professionnel et fiable.",
    },
    {
      primaryText: "Votre {{make}} merite le meilleur soin. {{dealer}} offre un service certifie avec pieces d'origine. Reservez.",
      headline: "Service certifie {{make}} — {{city}}",
      description: "Reservez votre rendez-vous",
      ctaButton: "Book Now",
      imageGuidance: "Gros plan du technicien. Marque du concessionnaire. Ton professionnel et chaleureux.",
    },
    {
      primaryText: "Plus de 300 clients satisfaits ce mois chez {{dealer}}. Reservez votre rendez-vous de service en quelques clics.",
      headline: "Service de confiance — {{dealer}}",
      description: "Rapide, fiable, prix juste",
      ctaButton: "Book Now",
      imageGuidance: "Client souriant recevant ses cles. Centre de service moderne et propre.",
    },
  ],
  seasonal: [
    {
      primaryText: "Cette fin de semaine seulement chez {{dealer}}: financement special sur vehicules selectionnes. Appliquez en 60 sec.",
      headline: "Evenement du weekend — {{dealer}}",
      description: "Cette fin de semaine seulement",
      ctaButton: "Get Offer",
      imageGuidance: "Graphique evenementiel avec typographie audacieuse. Dates du weekend. Alignement de vehicules.",
    },
    {
      primaryText: "La liquidation saisonniere de {{dealer}} est en cours. Des centaines de vehicules. Financement flexible disponible.",
      headline: "Liquidation saisonniere — Economisez",
      description: "Duree limitee — appliquez",
      ctaButton: "Shop Now",
      imageGuidance: "Terrain plein de vehicules avec bannieres saisonnieres. Typographie audacieuse.",
    },
    {
      primaryText: "Rejoignez des centaines d'acheteurs qui ont economise gros. C'est votre tour — decouvrez vos options de financement.",
      headline: "Ne manquez pas notre vente — {{city}}",
      description: "Options de financement dispo",
      ctaButton: "Get Offer",
      imageGuidance: "Client heureux au volant. Theme saisonnier. Marque du concessionnaire.",
    },
  ],
  conquest: [
    {
      primaryText: "Vous pensez changer de concessionnaire? {{dealer}} a 200+ vehicules et 20+ preteurs. Decouvrez vos options.",
      headline: "Plus de choix chez {{dealer}}",
      description: "20+ preteurs pour vous",
      ctaButton: "Get Offer",
      imageGuidance: "Vue large de l'inventaire. Concessionnaire professionnel. Accent sur la selection.",
    },
    {
      primaryText: "Pourquoi se contenter de moins? {{dealer}} offre plus de preteurs, plus de vehicules et des approbations rapides.",
      headline: "Passez a {{dealer}} — {{city}}",
      description: "Appliquez — 60 secondes",
      ctaButton: "Apply Now",
      imageGuidance: "Graphique comparatif montrant les avantages cles. Professionnel, pas agressif.",
    },
    {
      primaryText: "Plus de 200 vehicules en inventaire. 20+ partenaires de pret. Approbations le jour meme chez {{dealer}} a {{city}}.",
      headline: "{{dealer}} — Plus d'options pour vous",
      description: "Decouvrez vos options",
      ctaButton: "Learn More",
      imageGuidance: "Vue aerienne du terrain. Inventaire impressionnant. Design de confiance.",
    },
  ],
  retention: [
    {
      primaryText: "C'est le temps d'un upgrade. Comme client {{dealer}}, vous avez acces prioritaire aux nouveautes et taux speciaux.",
      headline: "Ameliorez votre vehicule — {{dealer}}",
      description: "Offres exclusives pour vous",
      ctaButton: "Get Offer",
      imageGuidance: "Moment de relation client. Vehicule actuel vs upgrade. Ambiance VIP.",
    },
    {
      primaryText: "La valeur de votre echange n'a jamais ete aussi haute. {{dealer}} offre le meilleur prix. Decouvrez votre valeur.",
      headline: "Votre echange vaut plus maintenant",
      description: "Obtenez votre valeur d'echange",
      ctaButton: "Get Offer",
      imageGuidance: "Graphique d'evaluation d'echange. Fleche vers le haut. Design moderne et propre.",
    },
    {
      primaryText: "Merci d'etre client chez {{dealer}}. Reservez votre prochain service et profitez de nos avantages fidelite.",
      headline: "Avantages fidelite chez {{dealer}}",
      description: "Reservez — economisez plus",
      ctaButton: "Book Now",
      imageGuidance: "Imagerie chaleureuse. Poignee de main ou carte de remerciement. Badge de fidelite.",
    },
  ],
};

// --- Google Templates ---

const GOOGLE_TEMPLATES_EN: Record<CampaignType, GoogleTemplate> = {
  new_inventory: {
    headlines: [
      "New {{make}} {{model}} — {{city}}",
      "$0 Down Options Available",
      "{{year}} {{make}} {{model}} In Stock",
      "Financing Available — Apply Now",
      "{{dealer}} — New Vehicles",
    ],
    descriptions: [
      "New {{year}} {{make}} {{model}} available now. Flexible financing for every situation. Apply in 60 seconds at {{dealer}}.",
      "Over 200 new vehicles in stock. 20+ lenders competing for your business. Same-day approval available in {{city}}.",
      "Drive your new {{make}} {{model}} home today. $0 down options. Fast, easy application. Visit {{dealer}}.",
    ],
    displayUrlPath: "/new-inventory",
    sitelinkExtensions: ["Apply Now", "View Inventory", "$0 Down Program", "Book Test Drive"],
  },
  used_inventory: {
    headlines: [
      "Used {{make}} {{model}} — {{city}}",
      "From ${{weekly}}/Week — Apply Now",
      "{{year}} {{make}} {{model}} — {{km}} km",
      "Financing for Every Situation",
      "{{dealer}} — Quality Pre-Owned",
    ],
    descriptions: [
      "{{year}} {{make}} {{model}} at {{dealer}}. Flexible financing available. Apply online in 60 seconds for fast approval.",
      "Over 200 quality pre-owned vehicles. All inspected and ready. Same-day financing approval in {{city}}.",
      "Your next reliable vehicle is here. See real payments based on your situation. No obligation — apply at {{dealer}}.",
    ],
    displayUrlPath: "/used-cars",
    sitelinkExtensions: ["Apply Now", "View Inventory", "$0 Down Financing", "Fresh Start Program"],
  },
  service: {
    headlines: [
      "{{make}} Service — {{city}}",
      "Book Your Service Today",
      "Certified Technicians — {{dealer}}",
      "Quick Service Appointments",
      "{{dealer}} Service Center",
    ],
    descriptions: [
      "Factory-trained technicians at {{dealer}}. Genuine parts. Quick turnaround. Book your service appointment online today.",
      "Expert {{make}} service in {{city}}. Competitive pricing, certified quality. Call {{phone}} or book online.",
      "Trusted service for your vehicle. Over 300 customers served monthly. Book your appointment at {{dealer}} now.",
    ],
    displayUrlPath: "/service",
    sitelinkExtensions: ["Book Appointment", "Service Specials", "Parts Department", "Hours & Directions"],
  },
  seasonal: {
    headlines: [
      "Seasonal Sale — {{dealer}}",
      "Limited-Time Financing Offers",
      "This Weekend Only — {{city}}",
      "$0 Down — Seasonal Event",
      "{{dealer}} Clearance Event",
    ],
    descriptions: [
      "Seasonal clearance at {{dealer}}. Special financing on select vehicles. Don't miss out — offers end soon. Apply in 60 seconds.",
      "Hundreds of vehicles must go. Flexible financing for every situation. Same-day approval available at {{dealer}} in {{city}}.",
      "Join hundreds who saved big during our seasonal event. See your options today. $0 down available. Visit {{dealer}}.",
    ],
    displayUrlPath: "/seasonal-sale",
    sitelinkExtensions: ["Apply Now", "View Sale Vehicles", "$0 Down Options", "Directions"],
  },
  conquest: {
    headlines: [
      "More Options at {{dealer}}",
      "20+ Lenders — {{city}}",
      "Why {{dealer}}? More Selection",
      "Switch & Save — Apply Now",
      "{{city}}'s Financing Specialists",
    ],
    descriptions: [
      "Looking for a better dealership experience? {{dealer}} has 200+ vehicles and 20+ lending partners. Apply in 60 seconds.",
      "More lenders means more approvals. {{dealer}} in {{city}} — where financing works for every situation. Visit us today.",
      "Don't settle for one bank's answer. We work with 20+ lenders to find your best rate. Apply at {{dealer}}.",
    ],
    displayUrlPath: "/why-choose-us",
    sitelinkExtensions: ["Apply Now", "Our Lenders", "View Inventory", "About Us"],
  },
  retention: {
    headlines: [
      "Upgrade Your Ride — {{dealer}}",
      "Top Trade-In Values — {{city}}",
      "Loyalty Perks at {{dealer}}",
      "Time to Upgrade? See Options",
      "{{dealer}} — Valued Customers",
    ],
    descriptions: [
      "As a {{dealer}} customer, you get priority access to new arrivals and special financing rates. See your upgrade options today.",
      "Your trade-in is worth more than you think. {{dealer}} offers top dollar plus loyalty perks. Get your value now.",
      "Thank you for choosing {{dealer}}. Book your next service and enjoy exclusive loyalty benefits. We appreciate you.",
    ],
    displayUrlPath: "/loyalty",
    sitelinkExtensions: ["Get Trade Value", "Book Service", "New Arrivals", "Loyalty Program"],
  },
};

const GOOGLE_TEMPLATES_FR: Record<CampaignType, GoogleTemplate> = {
  new_inventory: {
    headlines: [
      "Nouveau {{make}} {{model}} — {{city}}",
      "0$ de mise de fonds dispo",
      "{{year}} {{make}} {{model}} en stock",
      "Financement dispo — Appliquez",
      "{{dealer}} — Vehicules neufs",
    ],
    descriptions: [
      "Nouveau {{year}} {{make}} {{model}} disponible. Financement flexible pour chaque situation. Demande en 60 secondes chez {{dealer}}.",
      "Plus de 200 vehicules neufs en inventaire. 20+ preteurs. Approbation le jour meme a {{city}}. Visitez {{dealer}}.",
      "Roulez en {{make}} {{model}} des aujourd'hui. 0$ de mise de fonds. Demande rapide et facile chez {{dealer}}.",
    ],
    displayUrlPath: "/inventaire-neuf",
    sitelinkExtensions: ["Faire une demande", "Voir l'inventaire", "Programme 0$ comptant", "Essai routier"],
  },
  used_inventory: {
    headlines: [
      "{{make}} {{model}} usage — {{city}}",
      "A partir de {{weekly}}$/sem",
      "{{year}} {{make}} {{model}} — {{km}} km",
      "Financement pour chaque situation",
      "{{dealer}} — Vehicules d'occasion",
    ],
    descriptions: [
      "{{year}} {{make}} {{model}} chez {{dealer}}. Financement flexible disponible. Demande en ligne en 60 secondes.",
      "Plus de 200 vehicules d'occasion de qualite. Tous inspectes. Approbation le jour meme a {{city}}.",
      "Votre prochain vehicule fiable est ici. Voyez vos vrais paiements. Sans obligation chez {{dealer}}.",
    ],
    displayUrlPath: "/vehicules-occasion",
    sitelinkExtensions: ["Faire une demande", "Voir l'inventaire", "Financement 0$ comptant", "Programme Nouveau Depart"],
  },
  service: {
    headlines: [
      "Service {{make}} — {{city}}",
      "Reservez votre service",
      "Techniciens certifies — {{dealer}}",
      "Rendez-vous de service rapide",
      "Centre de service {{dealer}}",
    ],
    descriptions: [
      "Techniciens certifies chez {{dealer}}. Pieces d'origine. Service rapide. Reservez votre rendez-vous en ligne.",
      "Service expert {{make}} a {{city}}. Prix competitifs, qualite certifiee. Appelez {{phone}} ou reservez en ligne.",
      "Service de confiance pour votre vehicule. Plus de 300 clients servis par mois. Reservez chez {{dealer}}.",
    ],
    displayUrlPath: "/service",
    sitelinkExtensions: ["Prendre rendez-vous", "Promotions service", "Departement de pieces", "Heures et directions"],
  },
  seasonal: {
    headlines: [
      "Vente saisonniere — {{dealer}}",
      "Offres de financement limitees",
      "Cette fin de semaine — {{city}}",
      "0$ comptant — Evenement",
      "Liquidation chez {{dealer}}",
    ],
    descriptions: [
      "Liquidation saisonniere chez {{dealer}}. Financement special sur vehicules selectionnes. Demande en 60 secondes.",
      "Des centaines de vehicules doivent partir. Financement flexible. Approbation le jour meme chez {{dealer}} a {{city}}.",
      "Rejoignez des centaines d'acheteurs satisfaits. Decouvrez vos options. 0$ de mise de fonds dispo chez {{dealer}}.",
    ],
    displayUrlPath: "/vente-saisonniere",
    sitelinkExtensions: ["Faire une demande", "Vehicules en solde", "Options 0$ comptant", "Directions"],
  },
  conquest: {
    headlines: [
      "Plus d'options chez {{dealer}}",
      "20+ preteurs — {{city}}",
      "Pourquoi {{dealer}}? Plus de choix",
      "Changez et economisez",
      "Specialistes en financement",
    ],
    descriptions: [
      "Vous cherchez une meilleure experience? {{dealer}} a 200+ vehicules et 20+ partenaires de pret. Demande en 60 secondes.",
      "Plus de preteurs = plus d'approbations. {{dealer}} a {{city}} — le financement pour chaque situation. Visitez-nous.",
      "Ne vous contentez pas d'une seule reponse. On travaille avec 20+ preteurs pour votre meilleur taux chez {{dealer}}.",
    ],
    displayUrlPath: "/pourquoi-nous",
    sitelinkExtensions: ["Faire une demande", "Nos preteurs", "Voir l'inventaire", "A propos"],
  },
  retention: {
    headlines: [
      "Ameliorez votre vehicule",
      "Meilleure valeur d'echange",
      "Avantages fidelite — {{dealer}}",
      "Temps d'un upgrade?",
      "{{dealer}} — Clients fideles",
    ],
    descriptions: [
      "Comme client {{dealer}}, vous avez acces prioritaire aux nouveautes et taux speciaux. Decouvrez vos options.",
      "Votre echange vaut plus que vous pensez. {{dealer}} offre le meilleur prix plus avantages fidelite.",
      "Merci de choisir {{dealer}}. Reservez votre prochain service et profitez d'avantages exclusifs.",
    ],
    displayUrlPath: "/fidelite",
    sitelinkExtensions: ["Valeur d'echange", "Reserver service", "Nouveautes", "Programme fidelite"],
  },
};

// --- Social Post Templates ---

const SOCIAL_DAY_THEMES_EN: Record<string, string> = {
  monday: "Motivation Monday",
  tuesday: "New Arrival Tuesday",
  wednesday: "Midweek Deal",
  thursday: "Throwback Thursday",
  friday: "Feature Friday",
  saturday: "Saturday Showroom",
  sunday: "Sunday Drive",
};

const SOCIAL_DAY_THEMES_FR: Record<string, string> = {
  monday: "Lundi Motivation",
  tuesday: "Mardi Nouveaute",
  wednesday: "Offre de mi-semaine",
  thursday: "Jeudi Souvenir",
  friday: "Vendredi Vedette",
  saturday: "Samedi au Salon",
  sunday: "Balade du Dimanche",
};

// --- AdCopyAgent ---

export class AdCopyAgent {
  private readonly dealershipConfig: DealershipConfig;
  private readonly inventoryService: AdCopyInventoryServiceDep;

  constructor(
    dealershipConfig: DealershipConfig,
    inventoryService: AdCopyInventoryServiceDep,
  ) {
    this.dealershipConfig = dealershipConfig;
    this.inventoryService = inventoryService;
  }

  /**
   * Returns the system prompt that would be used for AI-powered ad generation.
   * Useful for integrating with Claude API via the self-healing pipeline.
   */
  getSystemPrompt(
    campaignType: CampaignType,
    locale: "en-CA" | "fr-CA",
    vehicle?: AdCopyVehicle,
    offer?: AdCopyOffer,
    audience?: AdCopyAudience,
    keywords?: string[],
    competitorName?: string,
  ): string {
    return buildAdCopyPrompt({
      dealershipConfig: this.dealershipConfig,
      campaignType,
      locale,
      vehicle,
      offer,
      audience,
      keywords,
      competitorName,
    });
  }

  /**
   * Generates Meta ad sets from templates for the given campaign type.
   */
  generateMetaAds(
    campaignType: CampaignType,
    vehicle?: AdCopyVehicle,
    offer?: AdCopyOffer,
    audience?: AdCopyAudience,
    locale: "en-CA" | "fr-CA" = "en-CA",
  ): MetaAdSet[] {
    const templates = locale === "en-CA"
      ? META_TEMPLATES_EN[campaignType]
      : META_TEMPLATES_FR[campaignType];

    return templates.map((template) => {
      const primaryText = this.interpolate(template.primaryText, vehicle, offer);
      const headline = this.interpolate(template.headline, vehicle, offer);
      const description = this.interpolate(template.description, vehicle, offer);

      const allText = `${primaryText} ${headline} ${description}`;
      const complianceFlag = detectComplianceFlag(allText);

      return {
        primaryText,
        headline,
        description,
        ctaButton: template.ctaButton,
        imageGuidance: template.imageGuidance,
        complianceFlag,
        locale,
        specialAdCategory: "Credit" as const,
      };
    });
  }

  /**
   * Generates Google RSA ad sets from templates.
   */
  generateGoogleAds(
    keywords: string[],
    campaignType: CampaignType = "used_inventory",
    vehicle?: AdCopyVehicle,
    offer?: AdCopyOffer,
    locale: "en-CA" | "fr-CA" = "en-CA",
  ): GoogleAdSet[] {
    const template = locale === "en-CA"
      ? GOOGLE_TEMPLATES_EN[campaignType]
      : GOOGLE_TEMPLATES_FR[campaignType];

    const headlines = template.headlines.map((h) => this.interpolate(h, vehicle, offer));
    const descriptions = template.descriptions.map((d) => this.interpolate(d, vehicle, offer));

    const allText = [...headlines, ...descriptions].join(" ");
    const complianceFlag = detectComplianceFlag(allText);

    return [{
      headlines,
      descriptions,
      displayUrlPath: template.displayUrlPath,
      sitelinkExtensions: template.sitelinkExtensions,
      complianceFlag,
    }];
  }

  /**
   * Generates retargeting ad copy for VDP (Vehicle Detail Page) visitors.
   */
  generateRetargetingAds(
    vehicle: AdCopyVehicle,
    locale: "en-CA" | "fr-CA" = "en-CA",
  ): MetaAdSet[] {
    const isEnglish = locale === "en-CA";
    const dealer = this.dealershipConfig.dealershipName;

    const retargetingTemplates: MetaTemplate[] = isEnglish
      ? [
          {
            primaryText: `Still thinking about the ${vehicle.year} ${vehicle.make} ${vehicle.model}? It's still here — but not for long. Get your financing options in 60 seconds.`,
            headline: `Still Thinking About the ${vehicle.make} ${vehicle.model}?`,
            description: "Your vehicle is still available",
            ctaButton: "Get Offer",
            imageGuidance: "Dynamic catalog image of the specific vehicle they viewed. Clean, well-lit dealership photo.",
          },
          {
            primaryText: `Good news — that ${vehicle.year} ${vehicle.make} ${vehicle.model} you were looking at hasn't sold yet. Financing available. Don't miss it this time.`,
            headline: `The ${vehicle.make} ${vehicle.model} You Viewed Is Still Available`,
            description: "Apply now before it's gone",
            ctaButton: "Learn More",
            imageGuidance: "Same vehicle they viewed with a subtle 'still available' badge. Urgency without pressure.",
          },
        ]
      : [
          {
            primaryText: `Vous pensez encore au ${vehicle.year} ${vehicle.make} ${vehicle.model}? Il est encore la — mais pas pour longtemps. Decouvrez vos options en 60 secondes.`,
            headline: `Le ${vehicle.make} ${vehicle.model} vous interesse encore?`,
            description: "Votre vehicule est encore dispo",
            ctaButton: "Get Offer",
            imageGuidance: "Image du vehicule specifique qu'ils ont consulte. Photo propre et bien eclairee.",
          },
          {
            primaryText: `Bonne nouvelle — le ${vehicle.year} ${vehicle.make} ${vehicle.model} que vous avez regarde n'est pas encore vendu. Financement disponible.`,
            headline: `Le ${vehicle.make} ${vehicle.model} est encore disponible`,
            description: "Appliquez avant qu'il parte",
            ctaButton: "Learn More",
            imageGuidance: "Meme vehicule avec badge 'encore disponible'. Urgence sans pression.",
          },
        ];

    return retargetingTemplates.map((template) => {
      const allText = `${template.primaryText} ${template.headline} ${template.description}`;
      const complianceFlag = detectComplianceFlag(allText);

      return {
        primaryText: template.primaryText,
        headline: template.headline,
        description: template.description,
        ctaButton: template.ctaButton,
        imageGuidance: template.imageGuidance,
        complianceFlag,
        locale,
        specialAdCategory: "Credit" as const,
      };
    });
  }

  /**
   * Generates conquest ad copy targeting competitor searches.
   */
  generateConquestAds(
    competitorName: string,
    locale: "en-CA" | "fr-CA" = "en-CA",
  ): MetaAdSet[] {
    const dealer = this.dealershipConfig.dealershipName;
    const isEnglish = locale === "en-CA";

    const conquestTemplates: MetaTemplate[] = isEnglish
      ? [
          {
            primaryText: `Looking at ${competitorName}? See what ${dealer} has to offer first. 200+ vehicles. 20+ lenders. Faster approvals.`,
            headline: `Compare Before You Buy — ${dealer}`,
            description: "More options, more lenders",
            ctaButton: "Get Offer",
            imageGuidance: `Wide inventory shot. Professional branding for ${dealer}. No competitor logos or names in creative.`,
          },
          {
            primaryText: `Before you decide, check out ${dealer}. More lenders competing for you means better rates. Apply in 60 seconds.`,
            headline: `${dealer} — A Better Experience`,
            description: "20+ lenders competing for you",
            ctaButton: "Apply Now",
            imageGuidance: `Clean, inviting dealership photo. Trust-building design. Emphasis on the ${dealer} experience.`,
          },
        ]
      : [
          {
            primaryText: `Vous regardez ${competitorName}? Decouvrez ce que ${dealer} a a offrir. 200+ vehicules. 20+ preteurs. Approbations rapides.`,
            headline: `Comparez avant d'acheter — ${dealer}`,
            description: "Plus d'options, plus de preteurs",
            ctaButton: "Get Offer",
            imageGuidance: `Vue large de l'inventaire. Image professionnelle de ${dealer}. Aucun logo concurrent dans le visuel.`,
          },
          {
            primaryText: `Avant de decider, visitez ${dealer}. Plus de preteurs = meilleurs taux pour vous. Demande en 60 secondes.`,
            headline: `${dealer} — Une meilleure experience`,
            description: "20+ preteurs pour vous",
            ctaButton: "Apply Now",
            imageGuidance: `Photo accueillante du concessionnaire. Design de confiance. Accent sur l'experience ${dealer}.`,
          },
        ];

    return conquestTemplates.map((template) => {
      const allText = `${template.primaryText} ${template.headline} ${template.description}`;
      const complianceFlag = detectComplianceFlag(allText);

      return {
        primaryText: template.primaryText,
        headline: template.headline,
        description: template.description,
        ctaButton: template.ctaButton,
        imageGuidance: template.imageGuidance,
        complianceFlag,
        locale,
        specialAdCategory: "Credit" as const,
      };
    });
  }

  /**
   * Generates a social media post based on day of week and optional vehicle/promotion.
   */
  generateSocialPost(
    dayOfWeek: string,
    vehicle?: AdCopyVehicle,
    promotion?: string,
    locale: "en-CA" | "fr-CA" = "en-CA",
  ): SocialPost {
    const isEnglish = locale === "en-CA";
    const dealer = this.dealershipConfig.dealershipName;
    const dayLower = dayOfWeek.toLowerCase();
    const themes = isEnglish ? SOCIAL_DAY_THEMES_EN : SOCIAL_DAY_THEMES_FR;
    const theme = themes[dayLower] ?? (isEnglish ? "Featured Vehicle" : "Vehicule vedette");

    let caption: string;
    let imageDescription: string;
    let hashtags: string[];
    let cta: string;

    if (vehicle) {
      if (isEnglish) {
        caption = `${theme}: ${vehicle.year} ${vehicle.make} ${vehicle.model}${vehicle.trim ? ` ${vehicle.trim}` : ""}. ${
          vehicle.monthlyPayment ? `Payments from $${vehicle.monthlyPayment}/month. ` : ""
        }${promotion ? `${promotion}. ` : ""}Financing options available for every situation. Link in bio to apply.`;
        imageDescription = `Clean, well-lit photo of the ${vehicle.year} ${vehicle.make} ${vehicle.model}. ${vehicle.monthlyPayment ? `Monthly payment overlay: $${vehicle.monthlyPayment}/mo.` : ""} ${dealer} branding.`;
        hashtags = [`#${vehicle.make}`, `#${vehicle.model}`, "#CarFinancing", "#Ottawa", `#${dealer.replace(/\s+/g, "")}`, "#DriveToday"];
        cta = "Link in bio to apply — takes 60 seconds.";
      } else {
        caption = `${theme}: ${vehicle.year} ${vehicle.make} ${vehicle.model}${vehicle.trim ? ` ${vehicle.trim}` : ""}. ${
          vehicle.monthlyPayment ? `Paiements a partir de ${vehicle.monthlyPayment}$/mois. ` : ""
        }${promotion ? `${promotion}. ` : ""}Options de financement pour chaque situation. Lien en bio pour appliquer.`;
        imageDescription = `Photo propre et bien eclairee du ${vehicle.year} ${vehicle.make} ${vehicle.model}. ${vehicle.monthlyPayment ? `Paiement mensuel affiche: ${vehicle.monthlyPayment}$/mois.` : ""} Marque ${dealer}.`;
        hashtags = [`#${vehicle.make}`, `#${vehicle.model}`, "#FinancementAuto", "#Gatineau", `#${dealer.replace(/\s+/g, "")}`, "#RoulezAujourdHui"];
        cta = "Lien en bio pour appliquer — ca prend 60 secondes.";
      }
    } else {
      if (isEnglish) {
        caption = `${theme} at ${dealer}. ${promotion ? `${promotion}. ` : ""}Over 200 vehicles in stock. Financing for every situation. Come visit us or apply online — link in bio.`;
        imageDescription = `Wide shot of ${dealer} lot or showroom. Warm, inviting. Dealership branding visible.`;
        hashtags = ["#CarDealership", "#AutoFinancing", "#Ottawa", `#${dealer.replace(/\s+/g, "")}`, "#DriveToday"];
        cta = "Visit us or apply online — link in bio.";
      } else {
        caption = `${theme} chez ${dealer}. ${promotion ? `${promotion}. ` : ""}Plus de 200 vehicules en inventaire. Financement pour chaque situation. Visitez-nous ou appliquez en ligne.`;
        imageDescription = `Vue large du terrain ou du salon de ${dealer}. Ambiance chaleureuse et accueillante. Marque visible.`;
        hashtags = ["#Concessionnaire", "#FinancementAuto", "#Gatineau", `#${dealer.replace(/\s+/g, "")}`, "#RoulezAujourdHui"];
        cta = "Visitez-nous ou appliquez en ligne — lien en bio.";
      }
    }

    const allText = caption;
    const complianceFlag = detectComplianceFlag(allText);

    // Optimal posting times by day
    const postTimes: Record<string, string> = {
      monday: "11:00",
      tuesday: "10:00",
      wednesday: "11:00",
      thursday: "12:00",
      friday: "10:00",
      saturday: "09:00",
      sunday: "10:00",
    };

    return {
      platform: "facebook",
      caption,
      imageDescription,
      hashtags,
      cta,
      postTime: postTimes[dayLower] ?? "11:00",
      complianceFlag,
      locale,
    };
  }

  // --- Private Helpers ---

  private interpolate(
    template: string,
    vehicle?: AdCopyVehicle,
    offer?: AdCopyOffer,
  ): string {
    let result = template;

    // Dealership substitutions
    result = result.replace(/\{\{dealer\}\}/g, this.dealershipConfig.dealershipName);
    result = result.replace(/\{\{city\}\}/g, this.extractCity(this.dealershipConfig.address));
    result = result.replace(/\{\{phone\}\}/g, this.dealershipConfig.phone);

    // Vehicle substitutions
    if (vehicle) {
      result = result.replace(/\{\{year\}\}/g, String(vehicle.year));
      result = result.replace(/\{\{make\}\}/g, vehicle.make);
      result = result.replace(/\{\{model\}\}/g, vehicle.model);
      result = result.replace(/\{\{trim\}\}/g, vehicle.trim ?? "");
      result = result.replace(/\{\{km\}\}/g, vehicle.mileage !== undefined ? vehicle.mileage.toLocaleString() : "");
      result = result.replace(/\{\{price\}\}/g, vehicle.price !== undefined ? vehicle.price.toLocaleString() : "");
      result = result.replace(/\{\{weekly\}\}/g, vehicle.weeklyPayment !== undefined ? String(vehicle.weeklyPayment) : "");
      result = result.replace(/\{\{monthly\}\}/g, vehicle.monthlyPayment !== undefined ? String(vehicle.monthlyPayment) : "");
    }

    // Offer substitutions
    if (offer) {
      result = result.replace(/\{\{offer_title\}\}/g, offer.title);
      result = result.replace(/\{\{offer_details\}\}/g, offer.details);
      result = result.replace(/\{\{end_date\}\}/g, offer.endDate ?? "");
    }

    return result;
  }

  private extractCity(address: string): string {
    // Extract city from address like "123 Main St, Ottawa, ON K1A 0B1"
    const parts = address.split(",");
    if (parts.length >= 2) {
      return parts[1].trim();
    }
    return address;
  }
}
