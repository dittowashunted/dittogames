export const POLLS = [
  {
    id: 'favorite-album',
    title: 'Favorite Album of All Time',
    tagline: 'Pick your desert-island record from 200+ classics.',
    emoji: '🎧',
    theme: 'poll-card--vinyl',
    status: 'live',
    type: 'choice',
  },
  {
    id: 'best-video-game',
    title: 'Best Video Game of All Time',
    tagline: 'Arcade classics to this year’s biggest release — pick the GOAT.',
    emoji: '🎮',
    theme: 'poll-card--arcade',
    status: 'live',
    type: 'choice',
  },
  {
    id: 'greatest-movie',
    title: 'Greatest Movie of All Time',
    tagline: 'A century of film, one favorite. Pick the one you’d defend.',
    emoji: '🎬',
    theme: 'poll-card--reel',
    status: 'live',
    type: 'choice',
  },
];

export function getPollMeta(id) {
  return POLLS.find((p) => p.id === id && p.status === 'live') || null;
}
