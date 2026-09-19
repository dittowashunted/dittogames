// One consistent, hand-drawn icon set (stroke-based line icons, currentColor)
// for every game and poll card — replaces plain Unicode emoji, which is the
// single biggest "made by an AI in five minutes" tell a card grid can have.
export const ICONS = {
  snake: `
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M7 30c4 0 4-9 9-9s4 10 9 10 4-10 9-10 5 5 8 4" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="39" cy="12" r="3" fill="currentColor"/>
    </svg>`,

  'super-tic-tac-toe': `
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M17 4v40M31 4v40M4 17h40M4 31h40" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
      <path d="M21 21v10M27 21v10M17 25h14" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" opacity="0.85"/>
    </svg>`,

  'tic-tac-toe': `
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M17 6v36M31 6v36M6 17h36M6 31h36" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
      <path d="M9 9l6.5 6.5M15.5 9L9 15.5" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
      <circle cx="38" cy="38" r="5.5" stroke="currentColor" stroke-width="3"/>
    </svg>`,

  'connect-four': `
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="5" y="9" width="38" height="33" rx="6" stroke="currentColor" stroke-width="3"/>
      <circle cx="14" cy="18" r="3.3" fill="currentColor"/>
      <circle cx="24" cy="18" r="3.3" stroke="currentColor" stroke-width="2"/>
      <circle cx="34" cy="18" r="3.3" stroke="currentColor" stroke-width="2"/>
      <circle cx="14" cy="28" r="3.3" fill="currentColor"/>
      <circle cx="24" cy="28" r="3.3" fill="currentColor"/>
      <circle cx="34" cy="28" r="3.3" stroke="currentColor" stroke-width="2"/>
      <circle cx="14" cy="36" r="3.3" stroke="currentColor" stroke-width="2"/>
      <circle cx="24" cy="36" r="3.3" stroke="currentColor" stroke-width="2"/>
      <circle cx="34" cy="36" r="3.3" stroke="currentColor" stroke-width="2"/>
    </svg>`,

  'rock-paper-scissors': `
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="9" cy="24" r="7" stroke="currentColor" stroke-width="2.5"/>
      <rect x="18" y="15" width="12" height="18" rx="2.5" stroke="currentColor" stroke-width="2.5"/>
      <path d="M36 15l6 18M42 15l-6 18" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
      <circle cx="36" cy="34.5" r="2" fill="currentColor"/>
      <circle cx="42" cy="34.5" r="2" fill="currentColor"/>
    </svg>`,

  'dots-and-boxes': `
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="11" y="11" width="12" height="12" fill="currentColor" opacity="0.3"/>
      <path d="M10 10h14M10 10v14M24 10v14M10 24h14" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
      <path d="M24 24h14M38 10v14M24 24v14M24 38h14" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" opacity="0.45"/>
      <circle cx="10" cy="10" r="2.6" fill="currentColor"/>
      <circle cx="24" cy="10" r="2.6" fill="currentColor"/>
      <circle cx="38" cy="10" r="2.6" fill="currentColor"/>
      <circle cx="10" cy="24" r="2.6" fill="currentColor"/>
      <circle cx="24" cy="24" r="2.6" fill="currentColor"/>
      <circle cx="38" cy="24" r="2.6" fill="currentColor"/>
      <circle cx="10" cy="38" r="2.6" fill="currentColor"/>
      <circle cx="24" cy="38" r="2.6" fill="currentColor"/>
      <circle cx="38" cy="38" r="2.6" fill="currentColor"/>
    </svg>`,

  '2048': `
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="5" y="5" width="16" height="16" rx="4" stroke="currentColor" stroke-width="2.5"/>
      <rect x="27" y="5" width="16" height="16" rx="4" fill="currentColor" opacity="0.85"/>
      <rect x="5" y="27" width="16" height="16" rx="4" fill="currentColor" opacity="0.5"/>
      <rect x="27" y="27" width="16" height="16" rx="4" stroke="currentColor" stroke-width="2.5"/>
    </svg>`,

  'memory-match': `
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <g transform="rotate(-8 14 22)">
        <rect x="6" y="10" width="16" height="24" rx="3" stroke="currentColor" stroke-width="2.5"/>
        <path d="M9.5 15.5l9 9M18.5 15.5l-9 9" stroke="currentColor" stroke-width="1.6" opacity="0.55"/>
      </g>
      <g transform="rotate(8 34 22)">
        <rect x="26" y="10" width="16" height="24" rx="3" stroke="currentColor" stroke-width="2.5"/>
        <path d="M34 16v12M28 22h12" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>
      </g>
    </svg>`,

  breakout: `
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="6" y="7" width="9" height="4.5" rx="1.2" fill="currentColor"/>
      <rect x="17" y="7" width="9" height="4.5" rx="1.2" fill="currentColor" opacity="0.6"/>
      <rect x="28" y="7" width="9" height="4.5" rx="1.2" fill="currentColor"/>
      <rect x="39" y="7" width="4" height="4.5" rx="1.2" fill="currentColor" opacity="0.6"/>
      <rect x="11.5" y="15" width="9" height="4.5" rx="1.2" fill="currentColor" opacity="0.6"/>
      <rect x="22.5" y="15" width="9" height="4.5" rx="1.2" fill="currentColor"/>
      <rect x="33.5" y="15" width="9" height="4.5" rx="1.2" fill="currentColor" opacity="0.6"/>
      <circle cx="31" cy="28" r="3" fill="currentColor"/>
      <rect x="13" y="39" width="18" height="4.5" rx="2.2" fill="currentColor"/>
    </svg>`,

  minesweeper: `
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="5" y="5" width="38" height="38" rx="5" stroke="currentColor" stroke-width="2.5"/>
      <path d="M17.3 5v38M30.7 5v38M5 17.3h38M5 30.7h38" stroke="currentColor" stroke-width="1.3" opacity="0.4"/>
      <path d="M13.5 12v11" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>
      <path d="M13.5 12.5l7 3.5-7 3.5z" fill="currentColor"/>
      <circle cx="34.5" cy="34.5" r="4" fill="currentColor"/>
      <path d="M34.5 27v3.2M34.5 38.8V42M27 34.5h3.2M38.8 34.5H42M29.4 29.4l2.3 2.3M39.6 39.6l-2.3-2.3M39.6 29.4l-2.3 2.3M29.4 39.6l2.3-2.3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
    </svg>`,

  'favorite-album': `
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="24" cy="24" r="18" stroke="currentColor" stroke-width="2.5"/>
      <circle cx="24" cy="24" r="12" stroke="currentColor" stroke-width="1.4" opacity="0.5"/>
      <circle cx="24" cy="24" r="7" stroke="currentColor" stroke-width="1.4" opacity="0.5"/>
      <circle cx="24" cy="24" r="3" fill="currentColor"/>
    </svg>`,

  'best-video-game': `
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M13 17h22a8 8 0 0 1 8 7.3l0.9 8a5 5 0 0 1-9 3.4l-2.6-3.7H23.7l-2.6 3.7a5 5 0 0 1-9-3.4l0.9-8A8 8 0 0 1 13 17z" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round"/>
      <path d="M16.5 24.5v6M13.5 27.5h6" stroke="currentColor" stroke-width="2.1" stroke-linecap="round"/>
      <circle cx="32.5" cy="24.5" r="1.8" fill="currentColor"/>
      <circle cx="36.5" cy="28.5" r="1.8" fill="currentColor"/>
    </svg>`,

  'greatest-movie': `
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="6" y="18" width="36" height="24" rx="3" stroke="currentColor" stroke-width="2.5"/>
      <path d="M6 18h36" stroke="currentColor" stroke-width="2.5"/>
      <path d="M9 18l4-8h6l-4 8M21.5 18l4-8h6l-4 8M34 18l3.4-8H41l-3.4 8" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
    </svg>`,

  flag: `
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M14 6v36" stroke="currentColor" stroke-width="3.4" stroke-linecap="round"/>
      <path d="M14 8c6-4 10 2 16-2v16c-6 4-10-2-16 2z" fill="currentColor"/>
    </svg>`,

  mine: `
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="24" cy="26" r="12" fill="currentColor"/>
      <path d="M24 6v6M24 40v2M6 26h4M40 26h2M11.5 13.5l3 3M33.5 13.5l-3 3" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
      <circle cx="19" cy="21" r="2.4" fill="#fff" opacity="0.85"/>
    </svg>`,

  rock: `
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M11 24c0-3 2-5 4-6-1-3 1-6 4-6 1-2 3-3 5-3 3 0 5 2 6 4 3 0 5 2 5 5 2 1 3 3 3 5v8c0 6-5 11-11 11h-4c-6 0-12-5-12-11z" stroke="currentColor" stroke-width="2.6" stroke-linejoin="round"/>
      <path d="M18 24v11M25 21v14M32 24v11" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" opacity="0.55"/>
    </svg>`,

  paper: `
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="9" y="6" width="30" height="36" rx="3" stroke="currentColor" stroke-width="2.6" stroke-linejoin="round"/>
      <path d="M15 16h18M15 24h18M15 32h11" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" opacity="0.7"/>
    </svg>`,

  scissors: `
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="14" r="5" stroke="currentColor" stroke-width="2.6"/>
      <circle cx="12" cy="34" r="5" stroke="currentColor" stroke-width="2.6"/>
      <path d="M16 17L40 40M16 31L40 8" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/>
    </svg>`,

  'sym-star': `
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M24 5l5.4 12.2L42 19l-9 8.8L35.3 41 24 34.4 12.7 41 15 27.8 6 19l12.6-1.8z" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"/>
    </svg>`,

  'sym-heart': `
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M24 41S6 29 6 17c0-6 5-10 10-10 3.5 0 6.6 1.8 8 5 1.4-3.2 4.5-5 8-5 5 0 10 4 10 10 0 12-18 24-18 24z" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"/>
    </svg>`,

  'sym-bolt': `
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M26 4 10 27h10l-4 17 20-25H26z" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"/>
    </svg>`,

  'sym-moon': `
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M31 6a18 18 0 1 0 11 25 14 14 0 0 1-11-25z" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"/>
    </svg>`,

  'sym-sun': `
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="24" cy="24" r="9" stroke="currentColor" stroke-width="2.4"/>
      <path d="M24 4v6M24 38v6M4 24h6M38 24h6M9.5 9.5l4.2 4.2M34.3 34.3l4.2 4.2M9.5 38.5l4.2-4.2M34.3 13.7l4.2-4.2" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>
    </svg>`,

  'sym-leaf': `
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M10 38C8 20 22 6 40 8c2 18-12 32-30 30z" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"/>
      <path d="M12 36 30 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.6"/>
    </svg>`,

  'sym-diamond': `
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M14 8h20l10 12L24 42 4 20z" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"/>
      <path d="M4 20h40M14 8l5 12-5 22M34 8l-5 12 5 22" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" opacity="0.55"/>
    </svg>`,

  'sym-cloud': `
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M14 34a9 9 0 0 1-1-17.9A11 11 0 0 1 34 13a8 8 0 0 1 3 15.9V34z" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"/>
    </svg>`,

  'sym-anchor': `
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="24" cy="10" r="4.4" stroke="currentColor" stroke-width="2.4"/>
      <path d="M24 15v27M13 24H6a18 18 0 0 0 18 18 18 18 0 0 0 18-18h-7" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>
      <path d="M16 22h16" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>
    </svg>`,

  'sym-camera': `
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M6 16h9l3-5h12l3 5h9v22H6z" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"/>
      <circle cx="24" cy="27" r="7" stroke="currentColor" stroke-width="2.4"/>
    </svg>`,
};

export function iconFor(id) {
  return ICONS[id] || '';
}
