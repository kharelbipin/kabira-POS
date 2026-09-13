import React, { useState } from 'react';

interface BottleImageProps {
  name: string;
  imageUrl?: string;
  size?: string;
  className?: string;
  preferSvg?: boolean;
}

export const BottleImage: React.FC<BottleImageProps> = ({
  name,
  imageUrl,
  className = 'max-h-full max-w-full object-contain',
  preferSvg = true,
}) => {
  const [imageFailed, setImageFailed] = useState(false);

  // If preferSvg is false and there's an image, display it
  if (!preferSvg && imageUrl && !imageFailed) {
    return (
      <img
        src={imageUrl}
        alt={name}
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={() => setImageFailed(true)}
        className={className}
      />
    );
  }

  // Fallback to high-fidelity SVG graphics matching the visual branding
  const lower = name.toLowerCase();

  // 1. Woodford Reserve Double Oaked
  if (lower.includes('woodford')) {
    return (
      <svg viewBox="0 0 100 160" className="h-32 w-auto drop-shadow-sm select-none" fill="none">
        {/* Stopper */}
        <rect x="42" y="6" width="16" height="8" rx="2" fill="#3E2723" />
        <rect x="45" y="14" width="10" height="10" fill="#2C1810" />
        {/* Neck */}
        <path d="M44 24 L56 24 L58 46 L42 46 Z" fill="#D97706" fillOpacity="0.85" />
        <rect x="43" y="28" width="14" height="6" fill="#1C1917" />
        {/* Shoulder & Body */}
        <path d="M42 46 C28 48 20 56 20 72 L20 144 C20 152 28 154 50 154 C72 154 80 152 80 144 L80 72 C80 56 72 48 58 46 Z" fill="url(#woodfordLiquid)" />
        {/* Glass reflection */}
        <path d="M24 72 L24 144 C24 148 26 150 30 150 L30 72 Z" fill="#FFFFFF" fillOpacity="0.2" />
        {/* Label */}
        <rect x="26" y="86" width="48" height="28" rx="2" fill="#0C0A09" stroke="#D97706" strokeWidth="0.8" />
        <text x="50" y="96" textAnchor="middle" fill="#FDE68A" fontSize="5.5" fontWeight="900" fontFamily="serif" letterSpacing="0.5">WOODFORD</text>
        <text x="50" y="103" textAnchor="middle" fill="#FDE68A" fontSize="4.5" fontWeight="700" fontFamily="serif" letterSpacing="0.5">RESERVE</text>
        <rect x="30" y="106" width="40" height="0.5" fill="#D97706" />
        <text x="50" y="111" textAnchor="middle" fill="#FFFFFF" fontSize="3.8" fontWeight="600" letterSpacing="0.3">DOUBLE OAKED</text>
        <defs>
          <linearGradient id="woodfordLiquid" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#78350F" />
            <stop offset="35%" stopColor="#B45309" />
            <stop offset="70%" stopColor="#D97706" />
            <stop offset="100%" stopColor="#78350F" />
          </linearGradient>
        </defs>
      </svg>
    );
  }

  // 2. Jack Daniel's Old No. 7
  if (lower.includes('jack') || lower.includes('daniel')) {
    return (
      <svg viewBox="0 0 100 160" className="h-32 w-auto drop-shadow-sm select-none" fill="none">
        {/* Cap */}
        <rect x="44" y="6" width="12" height="12" rx="1.5" fill="#1C1917" stroke="#44403C" strokeWidth="0.5" />
        <path d="M43 18 L57 18 L57 44 L43 44 Z" fill="#78350F" />
        <rect x="42" y="24" width="16" height="8" fill="#09090B" />
        {/* Square Shoulder */}
        <path d="M43 44 L25 54 L25 152 L75 152 L75 54 L57 44 Z" fill="url(#jdLiquid)" />
        {/* Iconic Black Label */}
        <rect x="25" y="66" width="50" height="74" fill="#09090B" stroke="#27272A" strokeWidth="0.8" />
        <path d="M28 69 L72 69 L72 137 L28 137 Z" stroke="#FAFAFA" strokeWidth="0.6" strokeDasharray="1 1" />
        <text x="50" y="80" textAnchor="middle" fill="#FFFFFF" fontSize="5" fontWeight="900" fontFamily="serif">JACK DANIEL'S</text>
        <text x="50" y="88" textAnchor="middle" fill="#FFFFFF" fontSize="3.5" fontWeight="700">Old</text>
        <circle cx="50" cy="100" r="9" fill="#09090B" stroke="#FFFFFF" strokeWidth="0.8" />
        <text x="50" y="103" textAnchor="middle" fill="#FFFFFF" fontSize="7" fontWeight="900" fontFamily="serif">No.7</text>
        <text x="50" y="117" textAnchor="middle" fill="#FFFFFF" fontSize="3.8" fontWeight="800">Tennessee</text>
        <text x="50" y="123" textAnchor="middle" fill="#FFFFFF" fontSize="3.2" fontWeight="600">WHISKEY</text>
        <defs>
          <linearGradient id="jdLiquid" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#451A03" />
            <stop offset="40%" stopColor="#92400E" />
            <stop offset="70%" stopColor="#B45309" />
            <stop offset="100%" stopColor="#451A03" />
          </linearGradient>
        </defs>
      </svg>
    );
  }

  // 3. Blanton's Single Barrel
  if (lower.includes('blanton')) {
    return (
      <svg viewBox="0 0 100 160" className="h-32 w-auto drop-shadow-sm select-none" fill="none">
        {/* Horse & Jockey Stopper */}
        <path d="M50 4 C52 4 56 6 56 10 C56 13 52 14 50 14 C48 14 44 13 44 10 C44 6 48 4 50 4 Z" fill="#CA8A04" />
        <path d="M46 7 L54 6 L58 10 L52 11 Z" fill="#EAB308" />
        <rect x="46" y="14" width="8" height="12" fill="#A16207" />
        {/* Round Faceted Bottle */}
        <path d="M45 26 L55 26 L62 44 C76 56 82 74 82 96 C82 124 68 148 50 148 C32 148 18 124 18 96 C18 74 24 56 38 44 Z" fill="url(#blantonsLiquid)" />
        {/* Facet lines */}
        <path d="M38 44 L30 80 L32 120 M50 26 L50 148 M62 44 L70 80 L68 120" stroke="#FEF3C7" strokeWidth="0.5" strokeOpacity="0.4" />
        {/* Circular Ring Label */}
        <ellipse cx="50" cy="94" rx="24" ry="16" fill="#FEF3C7" stroke="#78350F" strokeWidth="0.8" />
        <text x="50" y="91" textAnchor="middle" fill="#451A03" fontSize="5" fontWeight="900" fontFamily="serif">Blanton's</text>
        <text x="50" y="98" textAnchor="middle" fill="#78350F" fontSize="3.5" fontWeight="700">SINGLE BARREL</text>
        <text x="50" y="103" textAnchor="middle" fill="#92400E" fontSize="3" fontWeight="600">BOURBON</text>
        <defs>
          <linearGradient id="blantonsLiquid" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#78350F" />
            <stop offset="35%" stopColor="#D97706" />
            <stop offset="70%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#78350F" />
          </linearGradient>
        </defs>
      </svg>
    );
  }

  // 4. Maker's Mark Bourbon
  if (lower.includes('maker')) {
    return (
      <svg viewBox="0 0 100 160" className="h-32 w-auto drop-shadow-sm select-none" fill="none">
        {/* Dripping Red Wax Neck */}
        <path d="M44 8 L56 8 L56 46 C56 50 50 56 46 54 C42 52 44 48 44 46 Z" fill="#DC2626" />
        <path d="M42 28 C41 38 42 46 43 50 C44 54 41 58 40 50 C39 42 42 34 42 28 Z" fill="#B91C1C" />
        <path d="M54 30 C56 38 57 48 55 52 C53 54 52 48 53 40 Z" fill="#EF4444" />
        {/* Squarish Curved Amber Bottle */}
        <path d="M43 46 L26 56 C24 70 24 130 26 148 C28 152 72 152 74 148 C76 130 76 70 74 56 L57 46 Z" fill="url(#makersLiquid)" />
        {/* Cream Label with Torn Edge */}
        <rect x="28" y="74" width="44" height="62" rx="2" fill="#FEF3C7" stroke="#D97706" strokeWidth="0.5" />
        <circle cx="50" cy="88" r="6" fill="#DC2626" />
        <text x="50" y="90.5" textAnchor="middle" fill="#FFFFFF" fontSize="5" fontWeight="900">SIV</text>
        <text x="50" y="103" textAnchor="middle" fill="#451A03" fontSize="5.5" fontWeight="900" fontFamily="serif">Maker's</text>
        <text x="50" y="110" textAnchor="middle" fill="#451A03" fontSize="5.5" fontWeight="900" fontFamily="serif">Mark</text>
        <text x="50" y="117" textAnchor="middle" fill="#991B1B" fontSize="3.8" fontWeight="700">WHISKY</text>
        <text x="50" y="125" textAnchor="middle" fill="#78350F" fontSize="3" fontWeight="600">Handmade • 750 mL</text>
        <defs>
          <linearGradient id="makersLiquid" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#78350F" />
            <stop offset="40%" stopColor="#B45309" />
            <stop offset="70%" stopColor="#D97706" />
            <stop offset="100%" stopColor="#78350F" />
          </linearGradient>
        </defs>
      </svg>
    );
  }

  // 5. Casamigos Reposado Tequila
  if (lower.includes('casamigos')) {
    return (
      <svg viewBox="0 0 100 160" className="h-32 w-auto drop-shadow-sm select-none" fill="none">
        {/* Wooden Cap */}
        <rect x="42" y="8" width="16" height="12" rx="1" fill="#78350F" />
        {/* Glass Neck & Cork */}
        <rect x="44" y="20" width="12" height="24" fill="#FEF3C7" fillOpacity="0.4" stroke="#D1D5DB" strokeWidth="0.5" />
        {/* Cylindrical Clear Bottle with Golden Tequila */}
        <path d="M44 44 C34 46 26 54 26 68 L26 146 C26 150 30 152 50 152 C70 152 74 150 74 146 L74 68 C74 54 66 46 56 44 Z" fill="url(#casamigosLiquid)" stroke="#9CA3AF" strokeWidth="0.5" />
        {/* Handcrafted Off-White Label */}
        <rect x="28" y="70" width="44" height="66" fill="#F8FAFC" stroke="#E2E8F0" strokeWidth="0.5" />
        <text x="50" y="84" textAnchor="middle" fill="#0F172A" fontSize="5.5" fontWeight="900" fontFamily="sans-serif" letterSpacing="0.8">CASAMIGOS</text>
        <text x="50" y="93" textAnchor="middle" fill="#0F172A" fontSize="4.5" fontWeight="700">Tequila</text>
        <rect x="34" y="96" width="32" height="0.6" fill="#0F172A" />
        <text x="50" y="105" textAnchor="middle" fill="#B45309" fontSize="4.2" fontWeight="800">REPOSADO</text>
        <text x="50" y="113" textAnchor="middle" fill="#475569" fontSize="3" fontWeight="600">100% DE AGAVE</text>
        <text x="50" y="120" textAnchor="middle" fill="#475569" fontSize="2.8" fontStyle="italic">George Clooney & R. Gerber</text>
        <defs>
          <linearGradient id="casamigosLiquid" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#CA8A04" stopOpacity="0.75" />
            <stop offset="50%" stopColor="#FDE047" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#CA8A04" stopOpacity="0.75" />
          </linearGradient>
        </defs>
      </svg>
    );
  }

  // 6. Don Julio 1942 Tequila
  if (lower.includes('1942') || lower.includes('don julio')) {
    return (
      <svg viewBox="0 0 100 160" className="h-32 w-auto drop-shadow-sm select-none" fill="none">
        {/* Gold Cap */}
        <rect x="45" y="4" width="10" height="10" rx="1.5" fill="#EAB308" stroke="#CA8A04" strokeWidth="0.5" />
        {/* Tall Elongated Tapering Decanter */}
        <path d="M46 14 L54 14 L58 70 L68 146 C68 152 64 154 50 154 C36 154 32 152 32 146 L42 70 L46 14 Z" fill="url(#dj1942Liquid)" />
        {/* Gold Neck Ribbon */}
        <rect x="44" y="24" width="12" height="6" fill="#CA8A04" />
        {/* 1942 Inscription */}
        <text x="50" y="90" textAnchor="middle" fill="#FEF08A" fontSize="4" fontWeight="800" letterSpacing="0.5">Don Julio</text>
        <text x="50" y="104" textAnchor="middle" fill="#FEF08A" fontSize="9.5" fontWeight="900" fontFamily="serif" letterSpacing="1">1942</text>
        <text x="50" y="114" textAnchor="middle" fill="#FDE047" fontSize="3.5" fontWeight="700">TEQUILA AÑEJO</text>
        <defs>
          <linearGradient id="dj1942Liquid" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#451A03" />
            <stop offset="45%" stopColor="#92400E" />
            <stop offset="70%" stopColor="#B45309" />
            <stop offset="100%" stopColor="#451A03" />
          </linearGradient>
        </defs>
      </svg>
    );
  }

  // 7. Grey Goose French Vodka
  if (lower.includes('grey goose')) {
    return (
      <svg viewBox="0 0 100 160" className="h-32 w-auto drop-shadow-sm select-none" fill="none">
        {/* Blue & Silver Cap */}
        <rect x="45" y="6" width="10" height="12" rx="1" fill="#1E3A8A" />
        {/* Tall Frosted Neck */}
        <path d="M45 18 L55 18 L57 50 C68 54 70 66 70 82 L70 146 C70 152 66 154 50 154 C34 154 30 152 30 146 L30 82 C30 66 32 54 43 50 Z" fill="url(#greyGooseGlass)" stroke="#93C5FD" strokeWidth="0.5" />
        {/* French Alps & Geese Silhouette */}
        <path d="M30 110 L44 95 L56 105 L70 92 L70 146 C70 152 66 154 50 154 C34 154 30 152 30 146 Z" fill="url(#frenchAlps)" />
        {/* Goose in Flight */}
        <path d="M46 76 C50 72 54 73 57 71 C55 75 52 78 48 78 Z" fill="#3B82F6" />
        <path d="M42 82 C46 80 50 81 52 79 C50 83 48 85 44 85 Z" fill="#60A5FA" />
        {/* Typography */}
        <text x="50" y="64" textAnchor="middle" fill="#1E3A8A" fontSize="5" fontWeight="900" letterSpacing="0.8">GREY GOOSE</text>
        <text x="50" y="70" textAnchor="middle" fill="#1E40AF" fontSize="3.5" fontWeight="700">VODKA</text>
        <text x="50" y="138" textAnchor="middle" fill="#FFFFFF" fontSize="3" fontWeight="800">FRANCE • 1 LITER</text>
        <defs>
          <linearGradient id="greyGooseGlass" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#F8FAFC" stopOpacity="0.8" />
            <stop offset="50%" stopColor="#FFFFFF" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#E2E8F0" stopOpacity="0.8" />
          </linearGradient>
          <linearGradient id="frenchAlps" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#1E3A8A" stopOpacity="0.9" />
          </linearGradient>
        </defs>
      </svg>
    );
  }

  // 8. Tito's Handmade Vodka
  if (lower.includes('tito')) {
    return (
      <svg viewBox="0 0 100 160" className="h-32 w-auto drop-shadow-sm select-none" fill="none">
        {/* Cap */}
        <rect x="44" y="6" width="12" height="12" rx="1.5" fill="#B45309" />
        {/* Clear Glass Body */}
        <path d="M44 18 L56 18 L57 48 C68 52 72 62 72 76 L72 146 C72 152 66 154 50 154 C34 154 28 152 28 146 L28 76 C28 62 32 52 43 48 Z" fill="#F8FAFC" fillOpacity="0.85" stroke="#CBD5E1" strokeWidth="0.6" />
        {/* Iconic Copper Round Center Label */}
        <circle cx="50" cy="94" r="19" fill="#B45309" stroke="#78350F" strokeWidth="0.8" />
        <circle cx="50" cy="94" r="16.5" fill="#D97706" />
        <text x="50" y="90" textAnchor="middle" fill="#FFFFFF" fontSize="6.5" fontWeight="900" fontFamily="serif">Tito's</text>
        <text x="50" y="97" textAnchor="middle" fill="#FEF3C7" fontSize="3.2" fontWeight="700">Handmade</text>
        <text x="50" y="103" textAnchor="middle" fill="#FFFFFF" fontSize="4.2" fontWeight="900">VODKA</text>
        <text x="50" y="123" textAnchor="middle" fill="#475569" fontSize="3" fontWeight="800">AUSTIN • TEXAS</text>
      </svg>
    );
  }

  // 9. Crown Royal Canadian Whisky
  if (lower.includes('crown royal')) {
    return (
      <svg viewBox="0 0 100 160" className="h-32 w-auto drop-shadow-sm select-none" fill="none">
        {/* Gold Crown Cap */}
        <path d="M42 8 L58 8 L55 18 L45 18 Z" fill="#CA8A04" />
        <circle cx="50" cy="6" r="2.5" fill="#EAB308" />
        {/* Squat Cut-Glass Decanter Body */}
        <path d="M44 18 L56 18 C64 36 78 54 80 84 C82 120 72 148 50 148 C28 148 18 120 20 84 C22 54 36 36 44 18 Z" fill="url(#crownLiquid)" stroke="#A16207" strokeWidth="0.6" />
        {/* Purple/Red Velvet Cushion Label */}
        <rect x="32" y="74" width="36" height="36" rx="4" fill="#581C87" stroke="#EAB308" strokeWidth="0.8" />
        {/* Crown Motif */}
        <path d="M42 86 L50 82 L58 86 L56 92 L44 92 Z" fill="#FACC15" />
        <text x="50" y="99" textAnchor="middle" fill="#FFFFFF" fontSize="4.5" fontWeight="900" fontFamily="serif">Crown Royal</text>
        <text x="50" y="105" textAnchor="middle" fill="#FDE047" fontSize="3" fontWeight="700">FINE DE LUXE</text>
        <defs>
          <linearGradient id="crownLiquid" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#78350F" />
            <stop offset="40%" stopColor="#B45309" />
            <stop offset="70%" stopColor="#D97706" />
            <stop offset="100%" stopColor="#78350F" />
          </linearGradient>
        </defs>
      </svg>
    );
  }

  // 10. Hennessy VS Cognac
  if (lower.includes('hennessy')) {
    return (
      <svg viewBox="0 0 100 160" className="h-32 w-auto drop-shadow-sm select-none" fill="none">
        {/* Cap */}
        <rect x="44" y="6" width="12" height="14" rx="1.5" fill="#1C1917" stroke="#D97706" strokeWidth="0.5" />
        {/* Curved Neck & Cognac Body */}
        <path d="M44 20 L56 20 L58 50 C72 58 76 74 76 96 C76 130 68 152 50 152 C32 152 24 130 24 96 C24 74 28 58 42 50 Z" fill="url(#hennessyLiquid)" />
        {/* Cream Label with Gold Trim */}
        <rect x="28" y="78" width="44" height="42" rx="2" fill="#FEF3C7" stroke="#CA8A04" strokeWidth="0.8" />
        {/* Arm and Broadaxe Emblem */}
        <circle cx="50" cy="88" r="4.5" fill="#B45309" />
        <text x="50" y="99" textAnchor="middle" fill="#0C0A09" fontSize="5.5" fontWeight="900" fontFamily="serif">Hennessy</text>
        <text x="50" y="107" textAnchor="middle" fill="#B45309" fontSize="6.5" fontWeight="900">V • S</text>
        <text x="50" y="115" textAnchor="middle" fill="#451A03" fontSize="3" fontWeight="700">COGNAC</text>
        <defs>
          <linearGradient id="hennessyLiquid" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#451A03" />
            <stop offset="35%" stopColor="#78350F" />
            <stop offset="70%" stopColor="#B45309" />
            <stop offset="100%" stopColor="#451A03" />
          </linearGradient>
        </defs>
      </svg>
    );
  }

  // 11. Modelo Especial 12 Pack Box
  if (lower.includes('modelo')) {
    return (
      <svg viewBox="0 0 120 160" className="h-32 w-auto drop-shadow-sm select-none" fill="none">
        {/* 12 Pack Box */}
        <rect x="15" y="44" width="90" height="96" rx="4" fill="#1E3A8A" stroke="#CA8A04" strokeWidth="1" />
        {/* Box Handle */}
        <rect x="44" y="52" width="32" height="8" rx="4" fill="#0F172A" />
        {/* White/Gold Modelo Label */}
        <rect x="25" y="70" width="70" height="58" rx="2" fill="#F8FAFC" stroke="#E2E8F0" strokeWidth="0.6" />
        <text x="60" y="85" textAnchor="middle" fill="#1E3A8A" fontSize="7" fontWeight="900" fontFamily="serif" letterSpacing="0.8">Modelo</text>
        <text x="60" y="94" textAnchor="middle" fill="#CA8A04" fontSize="4.5" fontWeight="800">ESPECIAL</text>
        <rect x="35" y="98" width="50" height="0.6" fill="#CA8A04" />
        <text x="60" y="107" textAnchor="middle" fill="#1E293B" fontSize="4.2" fontWeight="900">12 PACK</text>
        <text x="60" y="116" textAnchor="middle" fill="#64748B" fontSize="3.2" fontWeight="700">CERVEZA • 1925</text>
        {/* Gold Accent corner tabs */}
        <path d="M15 44 L30 44 L15 59 Z" fill="#CA8A04" />
        <path d="M105 44 L90 44 L105 59 Z" fill="#CA8A04" />
      </svg>
    );
  }

  // 12. Jameson Irish Whiskey
  if (lower.includes('jameson')) {
    return (
      <svg viewBox="0 0 100 160" className="h-32 w-auto drop-shadow-sm select-none" fill="none">
        {/* Maroon Cap */}
        <rect x="44" y="6" width="12" height="14" rx="1.5" fill="#881337" />
        {/* Classic Green Bottle */}
        <path d="M44 20 L56 20 L57 48 C68 54 72 66 72 82 L72 146 C72 152 66 154 50 154 C34 154 28 152 28 146 L28 82 C28 66 32 54 43 48 Z" fill="url(#jamesonGreen)" />
        {/* Cream Label with Maroon & Gold Accent */}
        <rect x="28" y="74" width="44" height="60" fill="#FEF3C7" stroke="#14532D" strokeWidth="0.8" />
        <text x="50" y="86" textAnchor="middle" fill="#052E16" fontSize="5.5" fontWeight="900" fontFamily="serif" letterSpacing="0.5">JAMESON</text>
        <rect x="32" y="89" width="36" height="0.8" fill="#881337" />
        <text x="50" y="97" textAnchor="middle" fill="#881337" fontSize="4.2" fontWeight="800">IRISH WHISKEY</text>
        <text x="50" y="105" textAnchor="middle" fill="#052E16" fontSize="3.5" fontWeight="700">TRIPLE DISTILLED</text>
        <text x="50" y="122" textAnchor="middle" fill="#475569" fontSize="3" fontWeight="600">PRODUCT OF IRELAND</text>
        <defs>
          <linearGradient id="jamesonGreen" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#052E16" />
            <stop offset="35%" stopColor="#14532D" />
            <stop offset="70%" stopColor="#166534" />
            <stop offset="100%" stopColor="#052E16" />
          </linearGradient>
        </defs>
      </svg>
    );
  }

  // Generic Premium Spirits Bottle
  return (
    <svg viewBox="0 0 100 160" className="h-32 w-auto drop-shadow-sm select-none" fill="none">
      <rect x="44" y="8" width="12" height="12" rx="1" fill="#78350F" />
      <path d="M44 20 L56 20 L58 48 C68 54 72 66 72 82 L72 146 C72 152 66 154 50 154 C34 154 28 152 28 146 L28 82 C28 66 32 54 43 48 Z" fill="url(#genericLiquid)" />
      <rect x="30" y="74" width="40" height="50" rx="2" fill="#FEF3C7" stroke="#CA8A04" strokeWidth="0.8" />
      <text x="50" y="94" textAnchor="middle" fill="#451A03" fontSize="4.5" fontWeight="900" fontFamily="serif">377 SPIRITS</text>
      <text x="50" y="104" textAnchor="middle" fill="#78350F" fontSize="3.5" fontWeight="700">FINE RESERVE</text>
      <defs>
        <linearGradient id="genericLiquid" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#78350F" />
          <stop offset="50%" stopColor="#D97706" />
          <stop offset="100%" stopColor="#78350F" />
        </linearGradient>
      </defs>
    </svg>
  );
};
