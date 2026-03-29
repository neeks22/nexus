'use client';

import { useState, useEffect, useCallback } from 'react';
import styles from './page.module.css';

/* ============================================
   FUNNEL DATA TYPES
   ============================================ */

interface FunnelData {
  vehicleType: string;
  budget: string;
  monthlyIncome: string;
  jobTitle: string;
  employment: string;
  creditSituation: string;
  tradeIn: string;
  tradeInYear: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  caslConsent: boolean;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  completedAt?: string;
}

const STORAGE_KEY = 'nexus_funnel_progress';
const TOTAL_STEPS = 9;

/* ============================================
   TRUST MESSAGES (rotated per step)
   ============================================ */

const TRUST_MESSAGES = [
  { icon: 'shield', text: '98% approval rate' },
  { icon: 'check', text: 'No credit check to apply' },
  { icon: 'lock', text: '256-bit encrypted' },
  { icon: 'maple', text: 'CASL compliant' },
];

function getTrustMessage(step: number): { icon: string; text: string } {
  return TRUST_MESSAGES[(step - 1) % TRUST_MESSAGES.length];
}

/* ============================================
   VEHICLE RECOMMENDATIONS (based on type + budget)
   ============================================ */

interface VehicleRec {
  year: number;
  make: string;
  model: string;
  payment: string;
  type: string;
}

function getVehicleRecommendations(vehicleType: string, budget: string): VehicleRec[] {
  const recs: Record<string, Record<string, VehicleRec[]>> = {
    suv: {
      'under-250': [
        { year: 2021, make: 'Hyundai', model: 'Tucson', payment: '$229/mo', type: 'SUV' },
        { year: 2020, make: 'Kia', model: 'Sportage', payment: '$219/mo', type: 'SUV' },
        { year: 2020, make: 'Chevrolet', model: 'Equinox', payment: '$239/mo', type: 'SUV' },
      ],
      '250-350': [
        { year: 2023, make: 'Honda', model: 'CR-V', payment: '$299/mo', type: 'SUV' },
        { year: 2022, make: 'Toyota', model: 'RAV4', payment: '$319/mo', type: 'SUV' },
        { year: 2023, make: 'Hyundai', model: 'Tucson', payment: '$289/mo', type: 'SUV' },
      ],
      '350-500': [
        { year: 2024, make: 'Honda', model: 'CR-V', payment: '$379/mo', type: 'SUV' },
        { year: 2024, make: 'Toyota', model: 'RAV4', payment: '$399/mo', type: 'SUV' },
        { year: 2023, make: 'Ford', model: 'Escape', payment: '$359/mo', type: 'SUV' },
      ],
      '500-plus': [
        { year: 2025, make: 'Toyota', model: 'Highlander', payment: '$529/mo', type: 'SUV' },
        { year: 2024, make: 'Honda', model: 'Pilot', payment: '$549/mo', type: 'SUV' },
        { year: 2024, make: 'Hyundai', model: 'Palisade', payment: '$519/mo', type: 'SUV' },
      ],
    },
    sedan: {
      'under-250': [
        { year: 2021, make: 'Honda', model: 'Civic', payment: '$199/mo', type: 'Sedan' },
        { year: 2020, make: 'Toyota', model: 'Corolla', payment: '$189/mo', type: 'Sedan' },
        { year: 2021, make: 'Hyundai', model: 'Elantra', payment: '$209/mo', type: 'Sedan' },
      ],
      '250-350': [
        { year: 2023, make: 'Honda', model: 'Civic', payment: '$279/mo', type: 'Sedan' },
        { year: 2023, make: 'Toyota', model: 'Camry', payment: '$299/mo', type: 'Sedan' },
        { year: 2022, make: 'Mazda', model: 'Mazda3', payment: '$269/mo', type: 'Sedan' },
      ],
      '350-500': [
        { year: 2024, make: 'Honda', model: 'Accord', payment: '$369/mo', type: 'Sedan' },
        { year: 2024, make: 'Toyota', model: 'Camry', payment: '$389/mo', type: 'Sedan' },
        { year: 2024, make: 'Mazda', model: 'Mazda3', payment: '$349/mo', type: 'Sedan' },
      ],
      '500-plus': [
        { year: 2025, make: 'Honda', model: 'Accord', payment: '$519/mo', type: 'Sedan' },
        { year: 2025, make: 'Toyota', model: 'Camry XSE', payment: '$539/mo', type: 'Sedan' },
        { year: 2024, make: 'Mazda', model: 'Mazda6', payment: '$499/mo', type: 'Sedan' },
      ],
    },
    truck: {
      'under-250': [
        { year: 2019, make: 'Ford', model: 'Ranger', payment: '$239/mo', type: 'Truck' },
        { year: 2019, make: 'Chevrolet', model: 'Colorado', payment: '$229/mo', type: 'Truck' },
        { year: 2018, make: 'Toyota', model: 'Tacoma', payment: '$249/mo', type: 'Truck' },
      ],
      '250-350': [
        { year: 2022, make: 'Ford', model: 'Ranger', payment: '$319/mo', type: 'Truck' },
        { year: 2021, make: 'Toyota', model: 'Tacoma', payment: '$339/mo', type: 'Truck' },
        { year: 2022, make: 'Chevrolet', model: 'Colorado', payment: '$299/mo', type: 'Truck' },
      ],
      '350-500': [
        { year: 2023, make: 'Ford', model: 'F-150', payment: '$429/mo', type: 'Truck' },
        { year: 2023, make: 'RAM', model: '1500', payment: '$449/mo', type: 'Truck' },
        { year: 2023, make: 'Chevrolet', model: 'Silverado', payment: '$419/mo', type: 'Truck' },
      ],
      '500-plus': [
        { year: 2025, make: 'Ford', model: 'F-150', payment: '$549/mo', type: 'Truck' },
        { year: 2024, make: 'RAM', model: '1500', payment: '$569/mo', type: 'Truck' },
        { year: 2024, make: 'Toyota', model: 'Tundra', payment: '$559/mo', type: 'Truck' },
      ],
    },
    van: {
      'under-250': [
        { year: 2019, make: 'Dodge', model: 'Grand Caravan', payment: '$219/mo', type: 'Van' },
        { year: 2020, make: 'Kia', model: 'Carnival', payment: '$239/mo', type: 'Van' },
        { year: 2019, make: 'Toyota', model: 'Sienna', payment: '$249/mo', type: 'Van' },
      ],
      '250-350': [
        { year: 2022, make: 'Chrysler', model: 'Pacifica', payment: '$299/mo', type: 'Van' },
        { year: 2022, make: 'Kia', model: 'Carnival', payment: '$319/mo', type: 'Van' },
        { year: 2021, make: 'Toyota', model: 'Sienna', payment: '$339/mo', type: 'Van' },
      ],
      '350-500': [
        { year: 2023, make: 'Chrysler', model: 'Pacifica', payment: '$389/mo', type: 'Van' },
        { year: 2023, make: 'Kia', model: 'Carnival', payment: '$379/mo', type: 'Van' },
        { year: 2023, make: 'Toyota', model: 'Sienna', payment: '$419/mo', type: 'Van' },
      ],
      '500-plus': [
        { year: 2025, make: 'Chrysler', model: 'Pacifica', payment: '$529/mo', type: 'Van' },
        { year: 2024, make: 'Kia', model: 'Carnival', payment: '$519/mo', type: 'Van' },
        { year: 2024, make: 'Toyota', model: 'Sienna', payment: '$549/mo', type: 'Van' },
      ],
    },
    coupe: {
      'under-250': [
        { year: 2020, make: 'Honda', model: 'Civic Coupe', payment: '$219/mo', type: 'Coupe' },
        { year: 2019, make: 'Hyundai', model: 'Veloster', payment: '$199/mo', type: 'Coupe' },
        { year: 2020, make: 'Mazda', model: 'MX-5', payment: '$239/mo', type: 'Coupe' },
      ],
      '250-350': [
        { year: 2022, make: 'Honda', model: 'Civic Si', payment: '$299/mo', type: 'Coupe' },
        { year: 2022, make: 'Subaru', model: 'BRZ', payment: '$319/mo', type: 'Coupe' },
        { year: 2022, make: 'Mazda', model: 'MX-5', payment: '$329/mo', type: 'Coupe' },
      ],
      '350-500': [
        { year: 2023, make: 'Ford', model: 'Mustang', payment: '$429/mo', type: 'Coupe' },
        { year: 2023, make: 'Chevrolet', model: 'Camaro', payment: '$419/mo', type: 'Coupe' },
        { year: 2023, make: 'Toyota', model: 'GR86', payment: '$389/mo', type: 'Coupe' },
      ],
      '500-plus': [
        { year: 2025, make: 'Ford', model: 'Mustang GT', payment: '$569/mo', type: 'Coupe' },
        { year: 2024, make: 'Chevrolet', model: 'Camaro SS', payment: '$549/mo', type: 'Coupe' },
        { year: 2024, make: 'BMW', model: '2 Series', payment: '$579/mo', type: 'Coupe' },
      ],
    },
  };

  const type = vehicleType.toLowerCase();
  const budgetKey = budget || '250-350';
  const fallbackType = recs[type] ? type : 'suv';
  const fallbackBudget = recs[fallbackType][budgetKey] ? budgetKey : '250-350';

  return recs[fallbackType][fallbackBudget];
}

/* ============================================
   INLINE SVG ICONS — Vehicle Types
   ============================================ */

function SuvIcon(): JSX.Element {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M6 32h36v-6l-4-8H14l-6 8v6h-2z" stroke="currentColor" strokeWidth="2" fill="none" />
      <path d="M14 18l-2 4h24l-2-4H14z" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <rect x="16" y="20" width="6" height="4" rx="1" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <rect x="26" y="20" width="6" height="4" rx="1" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <circle cx="14" cy="34" r="3.5" stroke="currentColor" strokeWidth="2" fill="none" />
      <circle cx="34" cy="34" r="3.5" stroke="currentColor" strokeWidth="2" fill="none" />
      <line x1="6" y1="28" x2="42" y2="28" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function SedanIcon(): JSX.Element {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4 30h40v-4l-6-6-4-6H16l-4 6-6 6v4z" stroke="currentColor" strokeWidth="2" fill="none" />
      <path d="M16 14l-3 6h22l-3-6H16z" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <rect x="18" y="16" width="5" height="4" rx="1" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <rect x="26" y="16" width="5" height="4" rx="1" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <circle cx="13" cy="33" r="3.5" stroke="currentColor" strokeWidth="2" fill="none" />
      <circle cx="35" cy="33" r="3.5" stroke="currentColor" strokeWidth="2" fill="none" />
    </svg>
  );
}

function TruckIcon(): JSX.Element {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="4" y="18" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="2" fill="none" />
      <path d="M24 22h10l6 6v4H24V22z" stroke="currentColor" strokeWidth="2" fill="none" />
      <circle cx="12" cy="34" r="3.5" stroke="currentColor" strokeWidth="2" fill="none" />
      <circle cx="36" cy="34" r="3.5" stroke="currentColor" strokeWidth="2" fill="none" />
      <line x1="24" y1="18" x2="24" y2="32" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function VanIcon(): JSX.Element {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M6 32V18a4 4 0 0 1 4-4h18l8 8v10H6z" stroke="currentColor" strokeWidth="2" fill="none" />
      <rect x="10" y="17" width="6" height="5" rx="1" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <rect x="19" y="17" width="6" height="5" rx="1" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <path d="M28 17l5 5h3" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <circle cx="14" cy="34" r="3.5" stroke="currentColor" strokeWidth="2" fill="none" />
      <circle cx="34" cy="34" r="3.5" stroke="currentColor" strokeWidth="2" fill="none" />
    </svg>
  );
}

function CoupeIcon(): JSX.Element {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4 30h40v-4l-8-4-6-8H18l-6 8-6 4v4z" stroke="currentColor" strokeWidth="2" fill="none" />
      <path d="M18 14l-4 8h20l-4-8H18z" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <rect x="20" y="16" width="8" height="4" rx="1" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <circle cx="12" cy="33" r="3.5" stroke="currentColor" strokeWidth="2" fill="none" />
      <circle cx="36" cy="33" r="3.5" stroke="currentColor" strokeWidth="2" fill="none" />
    </svg>
  );
}

function QuestionIcon(): JSX.Element {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="24" cy="24" r="16" stroke="currentColor" strokeWidth="2" fill="none" />
      <path d="M19 19a5.5 5.5 0 0 1 9.5 3c0 3-4.5 3-4.5 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      <circle cx="24" cy="33" r="1.5" fill="currentColor" />
    </svg>
  );
}

/* ============================================
   INLINE SVG ICONS — Job Categories
   ============================================ */

function StethoscopeIcon(): JSX.Element {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M8 6v10a8 8 0 0 0 16 0V6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
      <circle cx="8" cy="5" r="2" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <circle cx="24" cy="5" r="2" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <circle cx="24" cy="24" r="3" stroke="currentColor" strokeWidth="2" fill="none" />
      <path d="M24 20v1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function HardHatIcon(): JSX.Element {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M6 20h20v3a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2v-3z" stroke="currentColor" strokeWidth="2" fill="none" />
      <path d="M8 20v-6a8 8 0 0 1 16 0v6" stroke="currentColor" strokeWidth="2" fill="none" />
      <line x1="6" y1="20" x2="26" y2="20" stroke="currentColor" strokeWidth="2.5" />
      <line x1="16" y1="8" x2="16" y2="20" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function BuildingIcon(): JSX.Element {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="6" y="6" width="20" height="20" rx="2" stroke="currentColor" strokeWidth="2" fill="none" />
      <rect x="11" y="10" width="4" height="4" rx="0.5" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <rect x="17" y="10" width="4" height="4" rx="0.5" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <rect x="11" y="17" width="4" height="4" rx="0.5" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <rect x="17" y="17" width="4" height="4" rx="0.5" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <path d="M14 26v-3h4v3" stroke="currentColor" strokeWidth="1.5" fill="none" />
    </svg>
  );
}

function ShoppingBagIcon(): JSX.Element {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M8 10h16l2 16H6L8 10z" stroke="currentColor" strokeWidth="2" fill="none" />
      <path d="M12 10V8a4 4 0 0 1 8 0v2" stroke="currentColor" strokeWidth="2" fill="none" />
    </svg>
  );
}

function BriefcaseIcon(): JSX.Element {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="4" y="10" width="24" height="16" rx="2" stroke="currentColor" strokeWidth="2" fill="none" />
      <path d="M12 10V8a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke="currentColor" strokeWidth="2" fill="none" />
      <line x1="4" y1="18" x2="28" y2="18" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function RocketIcon(): JSX.Element {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M16 4c-4 4-6 10-6 16h12c0-6-2-12-6-16z" stroke="currentColor" strokeWidth="2" fill="none" />
      <circle cx="16" cy="16" r="2" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <path d="M10 20l-4 4v2h4l2-4" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <path d="M22 20l4 4v2h-4l-2-4" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <path d="M12 28h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function SunsetIcon(): JSX.Element {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="16" cy="16" r="5" stroke="currentColor" strokeWidth="2" fill="none" />
      <line x1="16" y1="6" x2="16" y2="8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="16" y1="24" x2="16" y2="26" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="8" y1="8" x2="9.4" y2="9.4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="22.6" y1="22.6" x2="24" y2="24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="6" y1="16" x2="8" y2="16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="24" y1="16" x2="26" y2="16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="8" y1="24" x2="9.4" y2="22.6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="22.6" y1="9.4" x2="24" y2="8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function DotsIcon(): JSX.Element {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="10" cy="16" r="2.5" fill="currentColor" />
      <circle cx="16" cy="16" r="2.5" fill="currentColor" />
      <circle cx="22" cy="16" r="2.5" fill="currentColor" />
    </svg>
  );
}

/* ============================================
   INLINE SVG ICONS — UI Elements
   ============================================ */

function ArrowLeftIcon(): JSX.Element {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  );
}

function CheckCircleIcon(): JSX.Element {
  return (
    <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="8 12 11 15 16 9" />
    </svg>
  );
}

function ShieldSmallIcon(): JSX.Element {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

function LockSmallIcon(): JSX.Element {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function CheckSmallIcon(): JSX.Element {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function PhoneIcon(): JSX.Element {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.362 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.338 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}

function MailIcon(): JSX.Element {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <polyline points="22 7 12 13 2 7" />
    </svg>
  );
}

function CarDollarIcon(): JSX.Element {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4 22h24v-4l-4-6H10l-4 6v4z" stroke="currentColor" strokeWidth="2" fill="none" />
      <circle cx="10" cy="24" r="2.5" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <circle cx="22" cy="24" r="2.5" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <text x="16" y="14" textAnchor="middle" fill="currentColor" fontSize="10" fontWeight="bold">$</text>
    </svg>
  );
}

function NoTradeIcon(): JSX.Element {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4 22h24v-4l-4-6H10l-4 6v4z" stroke="currentColor" strokeWidth="2" fill="none" />
      <circle cx="10" cy="24" r="2.5" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <circle cx="22" cy="24" r="2.5" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <line x1="6" y1="6" x2="26" y2="26" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/* ============================================
   GTM DATA LAYER PUSH
   ============================================ */

function pushDataLayer(event: string, data?: Record<string, unknown>): void {
  if (typeof window !== 'undefined') {
    const w = window as unknown as { dataLayer?: unknown[] };
    w.dataLayer = w.dataLayer || [];
    w.dataLayer.push({ event, ...data });
  }
}

/* ============================================
   BUDGET LABEL HELPER
   ============================================ */

function getBudgetLabel(budget: string): string {
  const map: Record<string, string> = {
    'under-250': 'Under $250/mo',
    '250-350': '$250-$350/mo',
    '350-500': '$350-$500/mo',
    '500-plus': '$500+/mo',
  };
  return map[budget] || budget;
}

function getVehicleLabel(type: string): string {
  const map: Record<string, string> = {
    suv: 'SUV',
    sedan: 'Sedan',
    truck: 'Truck',
    van: 'Van/Minivan',
    coupe: 'Coupe/Sports',
    'not-sure': 'vehicle',
  };
  return map[type] || type;
}

/* ============================================
   MAIN FUNNEL COMPONENT
   ============================================ */

export default function ApplyPage(): JSX.Element {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [slideDirection, setSlideDirection] = useState<'forward' | 'backward'>('forward');

  const [formData, setFormData] = useState<FunnelData>({
    vehicleType: '',
    budget: '',
    monthlyIncome: '',
    jobTitle: '',
    employment: '',
    creditSituation: '',
    tradeIn: '',
    tradeInYear: '',
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    caslConsent: false,
    utmSource: '',
    utmMedium: '',
    utmCampaign: '',
  });

  // Load saved progress from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as { step: number; data: FunnelData };
        if (parsed.data && parsed.step && parsed.step < TOTAL_STEPS) {
          setFormData(parsed.data);
          setCurrentStep(parsed.step);
        }
      }
    } catch {
      // Ignore parse errors
    }
  }, []);

  // Capture UTM parameters from URL
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const utmSource = params.get('utm_source') || '';
      const utmMedium = params.get('utm_medium') || '';
      const utmCampaign = params.get('utm_campaign') || '';
      if (utmSource || utmMedium || utmCampaign) {
        setFormData((prev) => ({ ...prev, utmSource, utmMedium, utmCampaign }));
      }
    }
  }, []);

  // Auto-save progress
  useEffect(() => {
    if (currentStep < TOTAL_STEPS) {
      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ step: currentStep, data: formData })
        );
      } catch {
        // Ignore storage errors
      }
    }
  }, [currentStep, formData]);

  // Track step changes in GTM
  useEffect(() => {
    pushDataLayer(`funnel_step_${currentStep}`, {
      funnel_step: currentStep,
      vehicle_type: formData.vehicleType,
      budget: formData.budget,
    });
  }, [currentStep, formData.vehicleType, formData.budget]);

  const goNext = useCallback(() => {
    setSlideDirection('forward');
    setCurrentStep((s) => Math.min(s + 1, TOTAL_STEPS));
  }, []);

  const goBack = useCallback(() => {
    setSlideDirection('backward');
    setCurrentStep((s) => Math.max(s - 1, 1));
  }, []);

  const selectOption = useCallback(
    (field: keyof FunnelData, value: string, delay = 500) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
      setTimeout(() => goNext(), delay);
    },
    [goNext]
  );

  const handleInputChange = useCallback(
    (field: keyof FunnelData, value: string | boolean) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  const handleSubmit = useCallback(async () => {
    if (!formData.firstName || !formData.lastName || !formData.phone || !formData.email) {
      setSubmitError('Please fill in all fields.');
      return;
    }
    if (!formData.caslConsent) {
      setSubmitError('Please agree to receive communications to continue.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError('');

    try {
      const payload = { ...formData, completedAt: new Date().toISOString() };
      const res = await fetch('/api/funnel-lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error('Submission failed');
      }

      localStorage.removeItem(STORAGE_KEY);

      pushDataLayer('funnel_complete', {
        vehicle_type: formData.vehicleType,
        budget: formData.budget,
        monthly_income: formData.monthlyIncome,
        job_title: formData.jobTitle,
        employment: formData.employment,
        credit_situation: formData.creditSituation,
        trade_in: formData.tradeIn,
        utm_source: formData.utmSource,
        utm_medium: formData.utmMedium,
        utm_campaign: formData.utmCampaign,
      });

      goNext();
    } catch {
      setSubmitError('Something went wrong. Please try again or call us directly at 613-983-9834.');
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, goNext]);

  const progressPercent = Math.round(((currentStep - 1) / (TOTAL_STEPS - 1)) * 100);
  const trust = getTrustMessage(currentStep);

  return (
    <div className={styles.page}>
      {/* ── PROGRESS BAR (thin line at very top) ── */}
      {currentStep < TOTAL_STEPS && (
        <div className={styles.progressBarWrapper}>
          <div
            className={styles.progressFill}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      )}

      {/* ── TOP BAR ── */}
      <nav className={styles.topBar}>
        <div className={styles.topBarInner}>
          {currentStep > 1 && currentStep < TOTAL_STEPS ? (
            <button className={styles.backArrow} onClick={goBack} type="button" aria-label="Go back">
              <ArrowLeftIcon />
            </button>
          ) : (
            <div className={styles.backArrowPlaceholder} />
          )}
          <span className={styles.logo}>ReadyRide</span>
          <div className={styles.topTrust}>
            {trust.icon === 'shield' && <ShieldSmallIcon />}
            {trust.icon === 'check' && <CheckSmallIcon />}
            {trust.icon === 'lock' && <LockSmallIcon />}
            {trust.icon === 'maple' && <ShieldSmallIcon />}
            <span>{trust.text}</span>
          </div>
        </div>
      </nav>

      {/* ── STEP CONTAINER ── */}
      <main
        className={`${styles.stepContainer} ${
          slideDirection === 'forward' ? styles.slideForward : styles.slideBackward
        }`}
        key={currentStep}
      >
        {/* ═══════════════════════════════════════════
            STEP 1 — Vehicle Type (visual cards)
            ═══════════════════════════════════════════ */}
        {currentStep === 1 && (
          <div className={styles.step}>
            <h1 className={styles.stepTitle}>What are you looking for?</h1>
            <p className={styles.stepSubtext}>Pick the type that interests you most.</p>
            <div className={styles.vehicleGrid}>
              {[
                { value: 'suv', label: 'SUV', icon: <SuvIcon /> },
                { value: 'sedan', label: 'Sedan', icon: <SedanIcon /> },
                { value: 'truck', label: 'Truck', icon: <TruckIcon /> },
                { value: 'van', label: 'Van / Minivan', icon: <VanIcon /> },
                { value: 'coupe', label: 'Coupe / Sports', icon: <CoupeIcon /> },
                { value: 'not-sure', label: 'Not Sure Yet', icon: <QuestionIcon /> },
              ].map((opt) => (
                <button
                  key={opt.value}
                  className={`${styles.vehicleCard} ${
                    formData.vehicleType === opt.value ? styles.vehicleCardSelected : ''
                  }`}
                  onClick={() => selectOption('vehicleType', opt.value)}
                  type="button"
                >
                  {formData.vehicleType === opt.value && (
                    <span className={styles.selectedCheck}>
                      <CheckSmallIcon />
                    </span>
                  )}
                  <span className={styles.vehicleCardIcon}>{opt.icon}</span>
                  <span className={styles.vehicleCardLabel}>{opt.label}</span>
                </button>
              ))}
            </div>
            <div className={styles.trustRow}>
              <span className={styles.trustItem}><CheckSmallIcon /> 98% approval rate</span>
              <span className={styles.trustItem}><CheckSmallIcon /> Free, no obligation</span>
              <span className={styles.trustItem}><CheckSmallIcon /> 2-minute application</span>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════
            STEP 2 — Budget Range
            ═══════════════════════════════════════════ */}
        {currentStep === 2 && (
          <div className={styles.step}>
            <h1 className={styles.stepTitle}>What&rsquo;s your ideal monthly budget?</h1>
            <p className={styles.stepSubtext}>No judgment -- we work with all budgets</p>
            <div className={styles.stackedOptions}>
              {[
                { value: 'under-250', label: 'Under $250/mo' },
                { value: '250-350', label: '$250 \u2014 $350/mo' },
                { value: '350-500', label: '$350 \u2014 $500/mo' },
                { value: '500-plus', label: '$500+/mo' },
              ].map((opt) => (
                <button
                  key={opt.value}
                  className={`${styles.stackedButton} ${
                    formData.budget === opt.value ? styles.stackedSelected : ''
                  }`}
                  onClick={() => selectOption('budget', opt.value)}
                  type="button"
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════
            STEP 3 — Monthly Income
            ═══════════════════════════════════════════ */}
        {currentStep === 3 && (
          <div className={styles.step}>
            <h1 className={styles.stepTitle}>What&rsquo;s your approximate monthly income?</h1>
            <p className={styles.stepSubtext}>This helps us find the best financing options for you</p>
            <div className={styles.stackedOptions}>
              {[
                { value: 'under-2000', label: 'Under $2,000/mo' },
                { value: '2000-3000', label: '$2,000 \u2014 $3,000/mo' },
                { value: '3000-4500', label: '$3,000 \u2014 $4,500/mo' },
                { value: '4500-6000', label: '$4,500 \u2014 $6,000/mo' },
                { value: '6000-plus', label: '$6,000+/mo' },
              ].map((opt) => (
                <button
                  key={opt.value}
                  className={`${styles.stackedButton} ${
                    formData.monthlyIncome === opt.value ? styles.stackedSelected : ''
                  }`}
                  onClick={() => selectOption('monthlyIncome', opt.value)}
                  type="button"
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════
            STEP 4 — Job Title (visual cards)
            ═══════════════════════════════════════════ */}
        {currentStep === 4 && (
          <div className={styles.step}>
            <h1 className={styles.stepTitle}>What do you do for work?</h1>
            <p className={styles.stepSubtext}>Your job is your credit -- employed? You&rsquo;re halfway there.</p>
            <div className={styles.jobGrid}>
              {[
                { value: 'healthcare', label: 'Healthcare / Nursing', icon: <StethoscopeIcon /> },
                { value: 'trades', label: 'Trades / Construction', icon: <HardHatIcon /> },
                { value: 'government', label: 'Government / Municipal', icon: <BuildingIcon /> },
                { value: 'retail', label: 'Retail / Service', icon: <ShoppingBagIcon /> },
                { value: 'office', label: 'Office / Corporate', icon: <BriefcaseIcon /> },
                { value: 'self-employed', label: 'Self-Employed', icon: <RocketIcon /> },
                { value: 'retired', label: 'Retired', icon: <SunsetIcon /> },
                { value: 'other', label: 'Other', icon: <DotsIcon /> },
              ].map((opt) => (
                <button
                  key={opt.value}
                  className={`${styles.jobCard} ${
                    formData.jobTitle === opt.value ? styles.jobCardSelected : ''
                  }`}
                  onClick={() => selectOption('jobTitle', opt.value)}
                  type="button"
                >
                  {formData.jobTitle === opt.value && (
                    <span className={styles.selectedCheck}>
                      <CheckSmallIcon />
                    </span>
                  )}
                  <span className={styles.jobCardIcon}>{opt.icon}</span>
                  <span className={styles.jobCardLabel}>{opt.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════
            STEP 5 — Employment Status
            ═══════════════════════════════════════════ */}
        {currentStep === 5 && (
          <div className={styles.step}>
            <h1 className={styles.stepTitle}>What best describes your situation?</h1>
            <p className={styles.stepSubtext}>This helps us match you with the right lender</p>
            <div className={styles.stackedOptions}>
              {[
                { value: 'full-time', label: 'Full-time (6+ months)' },
                { value: 'part-time', label: 'Part-time' },
                { value: 'self-employed', label: 'Self-employed (2+ years)' },
                { value: 'new-job', label: 'New job (under 6 months)' },
              ].map((opt) => (
                <button
                  key={opt.value}
                  className={`${styles.stackedButton} ${
                    formData.employment === opt.value ? styles.stackedSelected : ''
                  }`}
                  onClick={() => selectOption('employment', opt.value)}
                  type="button"
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════
            STEP 6 — Credit Situation
            ═══════════════════════════════════════════ */}
        {currentStep === 6 && (
          <div className={styles.step}>
            <h1 className={styles.stepTitle}>How would you describe your credit?</h1>
            <p className={styles.stepSubtext}>We work with ALL credit situations. 98% approval rate.</p>
            <div className={styles.stackedOptions}>
              {[
                { value: 'excellent', label: 'Excellent (750+)', tint: 'green' },
                { value: 'good', label: 'Good (700\u2013749)', tint: 'lightgreen' },
                { value: 'fair', label: 'Fair (650\u2013699)', tint: 'yellowgreen' },
                { value: 'rebuilding', label: 'Rebuilding (under 650)', tint: 'yellow' },
                { value: 'not-sure', label: 'Not Sure', tint: 'neutral' },
              ].map((opt) => (
                <button
                  key={opt.value}
                  className={`${styles.stackedButton} ${styles[`credit_${opt.tint}`]} ${
                    formData.creditSituation === opt.value ? styles.stackedSelected : ''
                  }`}
                  onClick={() => selectOption('creditSituation', opt.value)}
                  type="button"
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <div className={styles.creditBadge}>
              <ShieldSmallIcon />
              This does NOT affect your credit score
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════
            STEP 7 — Trade-In
            ═══════════════════════════════════════════ */}
        {currentStep === 7 && (
          <div className={styles.step}>
            <h1 className={styles.stepTitle}>Do you have a vehicle to trade in?</h1>
            <p className={styles.stepSubtext}>A trade-in can lower your monthly payment significantly.</p>
            <div className={styles.tradeInOptions}>
              <button
                className={`${styles.tradeInCard} ${
                  formData.tradeIn === 'yes' ? styles.tradeInCardSelected : ''
                }`}
                onClick={() => {
                  setFormData((prev) => ({ ...prev, tradeIn: 'yes' }));
                  // Don't auto-advance — wait for year selection
                }}
                type="button"
              >
                <span className={styles.tradeInCardIcon}><CarDollarIcon /></span>
                <span className={styles.tradeInCardLabel}>Yes -- get my trade-in value</span>
              </button>
              <button
                className={`${styles.tradeInCard} ${
                  formData.tradeIn === 'no' ? styles.tradeInCardSelected : ''
                }`}
                onClick={() => selectOption('tradeIn', 'no')}
                type="button"
              >
                <span className={styles.tradeInCardIcon}><NoTradeIcon /></span>
                <span className={styles.tradeInCardLabel}>No -- buying without a trade</span>
              </button>
            </div>
            {formData.tradeIn === 'yes' && (
              <div className={styles.tradeInSub}>
                <label className={styles.tradeInSubLabel} htmlFor="tradeInYear">
                  Approximate year of your trade-in?
                </label>
                <select
                  id="tradeInYear"
                  className={styles.tradeInSelect}
                  value={formData.tradeInYear}
                  onChange={(e) => {
                    handleInputChange('tradeInYear', e.target.value);
                    if (e.target.value) {
                      setTimeout(() => goNext(), 500);
                    }
                  }}
                >
                  <option value="">Select year...</option>
                  {Array.from({ length: 12 }, (_, i) => 2026 - i).map((yr) => (
                    <option key={yr} value={String(yr)}>{yr}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════
            STEP 8 — Contact Info
            ═══════════════════════════════════════════ */}
        {currentStep === 8 && (
          <div className={styles.step}>
            <h1 className={styles.stepTitle}>Almost done! Where should we send your pre-approval?</h1>
            <p className={styles.stepSubtext}>We&rsquo;ll text you your results within 5 minutes -- no spam, ever.</p>
            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <div className={styles.floatingField}>
                  <input
                    id="firstName"
                    type="text"
                    className={styles.formInput}
                    value={formData.firstName}
                    onChange={(e) => handleInputChange('firstName', e.target.value)}
                    placeholder=" "
                    autoComplete="given-name"
                    required
                  />
                  <label className={styles.floatingLabel} htmlFor="firstName">First Name</label>
                </div>
              </div>
              <div className={styles.formGroup}>
                <div className={styles.floatingField}>
                  <input
                    id="lastName"
                    type="text"
                    className={styles.formInput}
                    value={formData.lastName}
                    onChange={(e) => handleInputChange('lastName', e.target.value)}
                    placeholder=" "
                    autoComplete="family-name"
                    required
                  />
                  <label className={styles.floatingLabel} htmlFor="lastName">Last Name</label>
                </div>
              </div>
              <div className={`${styles.formGroup} ${styles.formGroupFull}`}>
                <div className={styles.floatingField}>
                  <span className={styles.inputIcon}><PhoneIcon /></span>
                  <input
                    id="phone"
                    type="tel"
                    className={`${styles.formInput} ${styles.formInputWithIcon}`}
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    placeholder=" "
                    autoComplete="tel"
                    required
                  />
                  <label className={`${styles.floatingLabel} ${styles.floatingLabelWithIcon}`} htmlFor="phone">Phone Number</label>
                </div>
              </div>
              <div className={`${styles.formGroup} ${styles.formGroupFull}`}>
                <div className={styles.floatingField}>
                  <span className={styles.inputIcon}><MailIcon /></span>
                  <input
                    id="email"
                    type="email"
                    className={`${styles.formInput} ${styles.formInputWithIcon}`}
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    placeholder=" "
                    autoComplete="email"
                    required
                  />
                  <label className={`${styles.floatingLabel} ${styles.floatingLabelWithIcon}`} htmlFor="email">Email Address</label>
                </div>
              </div>
            </div>

            <label className={styles.consentLabel}>
              <input
                type="checkbox"
                checked={formData.caslConsent}
                onChange={(e) => handleInputChange('caslConsent', e.target.checked)}
                className={styles.consentCheckbox}
              />
              <span className={styles.consentText}>
                I agree to receive communications about my vehicle inquiry.
                You can unsubscribe at any time.
              </span>
            </label>

            {submitError && (
              <p className={styles.errorMessage}>{submitError}</p>
            )}

            <button
              className={styles.submitButton}
              onClick={handleSubmit}
              disabled={isSubmitting}
              type="button"
            >
              {isSubmitting ? (
                <span className={styles.spinner} />
              ) : (
                <>Get My Pre-Approval <span className={styles.submitArrow}>&rarr;</span></>
              )}
            </button>

            <div className={styles.contactTrustRow}>
              <span className={styles.contactTrustItem}>
                <LockSmallIcon /> 256-bit encrypted
              </span>
              <span className={styles.contactTrustItem}>
                <ShieldSmallIcon /> CASL compliant
              </span>
              <span className={styles.contactTrustItem}>
                <CheckSmallIcon /> No credit check
              </span>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════
            STEP 9 — Confirmation
            ═══════════════════════════════════════════ */}
        {currentStep === 9 && (
          <div className={styles.step}>
            <div className={styles.confirmIconWrap}>
              <div className={styles.confirmPulseRing} />
              <div className={styles.confirmPulseRing2} />
              <div className={styles.confirmCheckIcon}>
                <CheckCircleIcon />
              </div>
            </div>

            <div className={styles.confettiAccent}>
              <span className={styles.confettiDot} style={{ left: '10%', animationDelay: '0s' }} />
              <span className={styles.confettiDot} style={{ left: '25%', animationDelay: '0.2s' }} />
              <span className={styles.confettiDot} style={{ left: '40%', animationDelay: '0.4s' }} />
              <span className={styles.confettiDot} style={{ left: '55%', animationDelay: '0.1s' }} />
              <span className={styles.confettiDot} style={{ left: '70%', animationDelay: '0.3s' }} />
              <span className={styles.confettiDot} style={{ left: '85%', animationDelay: '0.5s' }} />
            </div>

            <h1 className={styles.confirmTitle}>You&rsquo;re Pre-Approved!</h1>
            <p className={styles.confirmSubtext}>
              {formData.firstName}, based on your {getBudgetLabel(formData.budget)} budget and interest in a {getVehicleLabel(formData.vehicleType)}, we recommend:
            </p>

            <div className={styles.vehicleRecGrid}>
              {getVehicleRecommendations(formData.vehicleType, formData.budget).map(
                (rec, i) => (
                  <div key={i} className={styles.vehicleRecCard}>
                    <div className={styles.vehicleRecBadge}>{rec.type}</div>
                    <div className={styles.vehicleRecInfo}>
                      <span className={styles.vehicleRecName}>
                        {rec.year} {rec.make} {rec.model}
                      </span>
                      <span className={styles.vehicleRecPayment}>
                        From {rec.payment}
                      </span>
                    </div>
                  </div>
                )
              )}
            </div>

            <div className={styles.nextSteps}>
              <h2 className={styles.nextStepsTitle}>What happens next</h2>
              <div className={styles.nextStepItem}>
                <span className={styles.nextStepNum}>1</span>
                <span>A specialist from ReadyRide will reach out within 5 minutes</span>
              </div>
              <div className={styles.nextStepItem}>
                <span className={styles.nextStepNum}>2</span>
                <span>We match you with the perfect vehicle and payment</span>
              </div>
              <div className={styles.nextStepItem}>
                <span className={styles.nextStepNum}>3</span>
                <span>Drive away happy -- it&rsquo;s that simple</span>
              </div>
            </div>

            <div className={styles.confirmActions}>
              <a href="tel:+16139839834" className={styles.callButton}>
                <PhoneIcon /> Call Us Now: 613-983-9834
              </a>
              <a href="/" className={styles.browseButton}>
                Browse Our Inventory
              </a>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
