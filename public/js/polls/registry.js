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
    id: 'soon-1',
    title: '???',
    tagline: 'A new poll is coming soon.',
    emoji: '🔮',
    theme: 'poll-card--soon',
    status: 'soon',
  },
  {
    id: 'soon-2',
    title: '???',
    tagline: 'A new poll is coming soon.',
    emoji: '✨',
    theme: 'poll-card--soon',
    status: 'soon',
  },
];

export function getPollMeta(id) {
  return POLLS.find((p) => p.id === id && p.status === 'live') || null;
}
