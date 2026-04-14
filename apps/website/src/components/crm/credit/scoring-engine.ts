import type { Lender, LenderTier, ScoredResult, ScoringProfile, CreditGrade } from './types';

export const LENDER_DB: Lender[] = [
  {
    name: 'Northlake Financial',
    tiers: [
      { tier: 'Titanium', ficoMin: 750, ficoMax: 999, rate: '6.99%', maxLTV: '150%+', maxPayCall: '$930+', reserve: '$600', color: '#C0C0C0' },
      { tier: 'Platinum', ficoMin: 700, ficoMax: 749, rate: '8.99%', maxLTV: '140%+', maxPayCall: '$930+', reserve: '$600', color: '#A0A0A0' },
      { tier: 'Gold', ficoMin: 600, ficoMax: 699, rate: '12.99%', maxLTV: '135%+', maxPayCall: '$875+', reserve: '$450', color: '#D4A437' },
      { tier: 'Standard', ficoMin: 0, ficoMax: 599, rate: '17.99%', maxLTV: '125%+', maxPayCall: '$800+', reserve: '$0-300', color: '#666' },
    ],
    minIncome: 1800, maxKm: 300000, maxTerm: 84,
    special: ['7-second approvals', 'No minimum FICO', 'Up to 300K km', 'Child Tax Credit accepted'],
    noGo: ['Repo in last 12 months', "G1/Learner's license", 'Structural/fire/flood damage'],
  },
  {
    name: 'TD Auto Finance',
    tiers: [
      { tier: '6 Key', ficoMin: 680, ficoMax: 999, rate: '11.99%', maxLTV: '140%', maxPayCall: 'varies', reserve: '$200-700', color: '#00A650' },
      { tier: '5 Key', ficoMin: 620, ficoMax: 679, rate: '13%+', maxLTV: '140%', maxPayCall: 'varies', reserve: '$200-700', color: '#00A650' },
      { tier: '4 Key', ficoMin: 560, ficoMax: 619, rate: '15%+', maxLTV: '140%', maxPayCall: 'varies', reserve: '$200-700', color: '#00A650' },
      { tier: '3 Key', ficoMin: 500, ficoMax: 559, rate: '18%+', maxLTV: '140%', maxPayCall: 'varies', reserve: '$200-700', color: '#00A650' },
      { tier: '2 Key', ficoMin: 0, ficoMax: 499, rate: '22%+', maxLTV: '140%', maxPayCall: 'varies', reserve: '$200-700', color: '#00A650' },
    ],
    minIncome: 1800, maxKm: 195000, maxTerm: 84,
    special: ['BK/Proposal specialist', 'Negative equity option', 'Flex rate', '500 Aeroplan points'],
    noGo: ['Child Tax/Social Assistance as income'],
    adminFee: '$799',
  },
  {
    name: 'iA Auto Finance',
    tiers: [
      { tier: '6th Gear', ficoMin: 650, ficoMax: 999, rate: '11.49%', maxLTV: '140%', maxPayCall: '$1000', reserve: '$100-1000', color: '#1E3A5F' },
      { tier: '5th Gear', ficoMin: 580, ficoMax: 649, rate: '15.49%', maxLTV: '140%', maxPayCall: '$1000', reserve: '$100-1000', color: '#1E3A5F' },
      { tier: '4th Gear', ficoMin: 520, ficoMax: 579, rate: '20.49%', maxLTV: '135%', maxPayCall: '$1000', reserve: '$100-1000', color: '#1E3A5F' },
      { tier: '3rd Gear', ficoMin: 450, ficoMax: 519, rate: '25.49%', maxLTV: '125%', maxPayCall: '$1000', reserve: '$100-1000', color: '#1E3A5F' },
      { tier: '2nd Gear', ficoMin: 0, ficoMax: 449, rate: '29.99%', maxLTV: '125%', maxPayCall: '$1000', reserve: '$100-1000', color: '#1E3A5F' },
    ],
    minIncome: 1500, maxKm: 180000, maxTerm: 84,
    special: ['BK approved on submission', 'Rate Reducing Loan (1/10th drop/year)', 'Returning customer program', 'iA Fast Income verification'],
    noGo: ['Max 140K km for 1st/2nd Gear'],
    adminFee: '$699',
  },
  {
    name: 'EdenPark',
    tiers: [
      { tier: 'EP Ride+', ficoMin: 680, ficoMax: 999, rate: '11.99%', maxLTV: '140%', maxPayCall: '$950', reserve: '$250-750', color: '#2D6B4F' },
      { tier: '6 Ride', ficoMin: 620, ficoMax: 679, rate: '13.99%', maxLTV: '140%', maxPayCall: '$950', reserve: '$250-750', color: '#2D6B4F' },
      { tier: '5 Ride', ficoMin: 560, ficoMax: 619, rate: '16.99%', maxLTV: '140%', maxPayCall: '$950', reserve: '$250-750', color: '#2D6B4F' },
      { tier: '4 Ride', ficoMin: 500, ficoMax: 559, rate: '19.99%', maxLTV: '135%', maxPayCall: '$950', reserve: '$250-750', color: '#2D6B4F' },
      { tier: '3 Ride', ficoMin: 400, ficoMax: 499, rate: '23.99%', maxLTV: '130%', maxPayCall: '$950', reserve: '$250-750', color: '#2D6B4F' },
      { tier: 'EP No Hit', ficoMin: 0, ficoMax: 399, rate: '19.99%', maxLTV: '130%', maxPayCall: '$950', reserve: '$250-750', color: '#2D6B4F' },
    ],
    minIncome: 1800, maxKm: 180000, maxTerm: 84,
    special: ['No Hit program for newcomers', 'Reserve paid on every deal', 'Full spectrum'],
    noGo: ['Structural damage', 'Theft recovery', 'Carfax >$7,500/incident'],
  },
  {
    name: 'AutoCapital Canada',
    tiers: [
      { tier: 'Tier 1', ficoMin: 600, ficoMax: 999, rate: '13.49%', maxLTV: '175%', maxPayCall: '55% TDSR', reserve: '$300-500', color: '#8B0000' },
      { tier: 'Tier 2', ficoMin: 550, ficoMax: 599, rate: '14.49%', maxLTV: '175%', maxPayCall: '55% TDSR', reserve: '$300-500', color: '#8B0000' },
      { tier: 'Tier 3', ficoMin: 500, ficoMax: 549, rate: '15.99%', maxLTV: '165%', maxPayCall: '50% TDSR', reserve: '$300-500', color: '#8B0000' },
      { tier: 'Tier 4', ficoMin: 450, ficoMax: 499, rate: '17.99%', maxLTV: '165%', maxPayCall: '47% TDSR', reserve: '$300-500', color: '#8B0000' },
      { tier: 'Tier 5', ficoMin: 400, ficoMax: 449, rate: '21.49%', maxLTV: '150%', maxPayCall: '43% TDSR', reserve: '$300-500', color: '#8B0000' },
      { tier: 'Tier 6', ficoMin: 0, ficoMax: 399, rate: '23.49%', maxLTV: '150%', maxPayCall: '43% TDSR', reserve: '$300-500', color: '#8B0000' },
    ],
    minIncome: 2000, maxKm: 195000, maxTerm: 84,
    special: ['P4E self-employed program', 'Co-signer release after 18 months', 'Highest all-in LTV (175%)'],
    noGo: ['Carfax damage >$7,500', 'Salvage/rebuilt'],
    adminFee: '$799',
  },
  {
    name: 'Rifco',
    tiers: [
      { tier: 'Drive Plan', ficoMin: 0, ficoMax: 499, rate: '29.95%', maxLTV: '130%', maxPayCall: '$950', reserve: 'n/a', color: '#4A2C2A' },
      { tier: 'Standard', ficoMin: 500, ficoMax: 599, rate: '29.95%', maxLTV: '125%', maxPayCall: '$950', reserve: '$250', color: '#4A2C2A' },
    ],
    minIncome: 3000, maxKm: 168000, maxTerm: 84,
    special: ['GPS/Starter interrupter on Drive Plan', 'Banking verification via Flinks', '5-10% discount on Drive Plan'],
    noGo: ['Carfax >$6,000', 'Max $35,000 finance', 'Max 168K km'],
    adminFee: '$395 + $595 device',
  },
  {
    name: 'Iceberg Finance',
    tiers: [
      { tier: 'Gold', ficoMin: 550, ficoMax: 999, rate: '12.99-20.25%', maxLTV: '140%', maxPayCall: '$825', reserve: '$300-500', color: '#0077B6' },
      { tier: 'Silver', ficoMin: 450, ficoMax: 549, rate: '20.99-27.25%', maxLTV: '140%', maxPayCall: '$775', reserve: '$300-500', color: '#0077B6' },
      { tier: 'Bronze', ficoMin: 0, ficoMax: 449, rate: '27.99-31.99%', maxLTV: '140%', maxPayCall: '$625', reserve: '$300-500', color: '#0077B6' },
    ],
    minIncome: 1750, maxKm: 180000, maxTerm: 72,
    special: ['Accepts foreign/international licenses', 'Accepts undischarged BK', 'Accepts SIN-9 (work permit)', 'Max age 74'],
    noGo: ['3+ insolvencies = auto decline', 'Social assistance/EI/Uber income'],
    adminFee: '$999 + $100 PPSA',
  },
  {
    name: 'Santander Consumer',
    tiers: [
      { tier: 'Standard', ficoMin: 0, ficoMax: 999, rate: 'varies', maxLTV: 'varies', maxPayCall: 'varies', reserve: 'varies', color: '#CC0000' },
    ],
    minIncome: 2500, maxKm: 195000, maxTerm: 84,
    special: ['Easy Income instant verification', 'Most generous Carfax (35% of BBV)', 'santanderconsumer.ca/easyincome'],
    noGo: ['Taxi/rideshare/commercial', 'Former police vehicles'],
    adminFee: 'varies',
  },
];

export function scoreLender(lender: Lender, profile: ScoringProfile): ScoredResult {
  let score = 0;
  let matchedTier: LenderTier | null = null;
  const reasons: string[] = [];
  const warnings: string[] = [];

  if (profile.income < lender.minIncome) {
    warnings.push(`Min income $${lender.minIncome}/mo \u2014 customer has $${profile.income}`);
    return { score: 0, tier: null, reasons: [], warnings, lender: lender.name };
  }

  for (const tier of lender.tiers) {
    if (profile.fico >= tier.ficoMin && profile.fico <= tier.ficoMax) {
      matchedTier = tier;
      break;
    }
  }
  if (!matchedTier) {
    // No tier matched — this customer falls outside all defined ranges
    warnings.push(`No matching tier for FICO ${profile.fico}`);
    return { score: 0, tier: null, reasons: [], warnings, lender: lender.name };
  }

  if (matchedTier) {
    if (profile.fico >= 700) score += 40;
    else if (profile.fico >= 600) score += 30;
    else if (profile.fico >= 500) score += 20;
    else score += 10;

    const rateNum = parseFloat(matchedTier.rate);
    if (!isNaN(rateNum)) {
      score += Math.max(0, 40 - rateNum);
      reasons.push(`Rate from ${matchedTier.rate} (${matchedTier.tier})`);
    }

    if (profile.income >= lender.minIncome * 1.5) {
      score += 10;
      reasons.push('Income well above minimum');
    }
  }

  if (profile.situation === 'bankruptcy') {
    if (lender.name === 'iA Auto Finance') { score += 30; reasons.push('BK SPECIALIST \u2014 approved on submission'); }
    else if (lender.name === 'TD Auto Finance') { score += 20; reasons.push('BK/Proposal programs available'); }
    else if (lender.name === 'Iceberg Finance') { score += 15; reasons.push('Accepts undischarged BK'); }
    else if (lender.name === 'EdenPark') { score += 10; reasons.push('Accepts BK'); }
  }

  if (profile.situation === 'proposal') {
    if (lender.name === 'iA Auto Finance') { score += 30; reasons.push('Proposal approved on submission'); }
    else if (lender.name === 'TD Auto Finance') { score += 20; reasons.push('CP specialist programs'); }
    else if (lender.name === 'Iceberg Finance') { score += 15; reasons.push('Accepts active proposals'); }
  }

  if (profile.situation === 'newcomer') {
    if (lender.name === 'EdenPark') { score += 30; reasons.push('EP No Hit program designed for newcomers'); }
    else if (lender.name === 'Iceberg Finance') { score += 25; reasons.push('Accepts foreign licenses + SIN-9'); }
    else if (lender.name === 'Northlake Financial') { score += 15; reasons.push('No minimum FICO requirement'); }
  }

  if (profile.selfEmployed) {
    if (lender.name === 'AutoCapital Canada') { score += 20; reasons.push('P4E self-employed program (full/alt/lite doc)'); }
    else if (lender.name === 'Santander Consumer') { score += 20; reasons.push('Easy Income instant verification for self-employed'); }
    else if (lender.name === 'iA Auto Finance') { score += 15; reasons.push('iA Fast Income verification'); }
    else if (lender.name === 'Rifco') { score += 10; reasons.push('Flinks banking verification'); }
  }

  // Santander bonuses — generous Carfax policy and Easy Income
  if (lender.name === 'Santander Consumer' && matchedTier) {
    score += 10;
    reasons.push('Easy Income verification + generous Carfax (35% BBV)');
  }

  return { score, tier: matchedTier, reasons, warnings, lender: lender.name };
}

export function tierColor(fico: number): string {
  if (fico >= 750) return '#10b981';
  if (fico >= 700) return '#34d399';
  if (fico >= 600) return '#f59e0b';
  if (fico >= 500) return '#f97316';
  return '#ef4444';
}

export function tierLabel(fico: number): string {
  if (fico >= 750) return 'PRIME (A)';
  if (fico >= 700) return 'NEAR-PRIME (B)';
  if (fico >= 600) return 'LIGHT SUBPRIME';
  if (fico >= 500) return 'MID SUBPRIME';
  if (fico >= 400) return 'DEEP SUBPRIME';
  return 'VERY DEEP SUBPRIME';
}

export function computeCreditGrade(fico: number, situation: string, selfEmployed: boolean, income: number): CreditGrade {
  let grade: string;
  if (fico >= 800) grade = 'A+';
  else if (fico >= 760) grade = 'A';
  else if (fico >= 730) grade = 'A-';
  else if (fico >= 700) grade = 'B+';
  else if (fico >= 660) grade = 'B';
  else if (fico >= 620) grade = 'B-';
  else if (fico >= 580) grade = 'C+';
  else if (fico >= 540) grade = 'C';
  else if (fico >= 500) grade = 'C-';
  else if (fico >= 480) grade = 'D+';
  else if (fico >= 450) grade = 'D';
  else if (fico >= 400) grade = 'D-';
  else grade = 'F';

  const parts: string[] = [];

  if (fico >= 730) parts.push('Low utilization');
  else if (fico >= 620) parts.push('Moderate utilization');
  else if (fico >= 500) parts.push('High utilization');
  else parts.push('Very high utilization');

  if (fico >= 700) parts.push('No missed payments');
  else if (fico >= 580) parts.push('Minor delinquencies likely');
  else if (fico >= 450) parts.push('Missed payments on file');
  else parts.push('Multiple missed payments');

  if (situation === 'bankruptcy') parts.push('Bankruptcy on file');
  else if (situation === 'proposal') parts.push('Consumer proposal active');
  else if (situation === 'newcomer') parts.push('Thin file / newcomer');
  else if (situation === 'repo') parts.push('Repossession history');

  if (selfEmployed) parts.push('Self-employed');

  if (income >= 5000) parts.push('Strong income');
  else if (income >= 3000) parts.push('Adequate income');
  else if (income > 0) parts.push('Low income');

  const gradeColors: Record<string, string> = {
    'A+': '#10b981', 'A': '#10b981', 'A-': '#34d399',
    'B+': '#22c55e', 'B': '#22c55e', 'B-': '#86efac',
    'C+': '#f59e0b', 'C': '#f59e0b', 'C-': '#fbbf24',
    'D+': '#f97316', 'D': '#f97316', 'D-': '#fb923c',
    'F': '#ef4444',
  };

  return {
    grade,
    color: gradeColors[grade] || '#ef4444',
    summary: parts.join(' \u00b7 '),
  };
}
