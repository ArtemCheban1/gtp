import type {VideoProps} from './types';

const tag = (s: string) =>
  '#' +
  s
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9]+/g, '')
    .toLowerCase();

/** "📷 Photos: …" line for photos that carry a credit (required by CC BY / CC BY-SA). */
function credits(props: VideoProps): string[] {
  const list = [...new Set(props.photos.map((p) => p.credit?.trim()).filter((c): c is string => !!c))];
  return list.length ? ['', `📷 Photos: ${list.join('; ')}`] : [];
}

type Style = {
  name: string;
  /** Lines above the fold: hook + call to comment. `cta` is the ending question from the video settings. */
  intro: (s: {seconds: number; cta: string}) => string[];
  /** Line right before the hidden answer */
  spoiler: string;
  /** Extra hashtags on top of the common ones */
  tags: string[];
};

export const CAPTION_STYLES: Style[] = [
  {
    name: 'Classic',
    intro: ({seconds, cta}) => [`📍 Where is this? ${seconds} seconds per photo — can you get it before the reveal?`, '', 'Answer in the video 👀', cta],
    spoiler: 'Answer below — no peeking 🙈',
    tags: ['#geoquiz'],
  },
  {
    name: '3 photos, 3 guesses',
    intro: ({cta}) => ['🌍 3 photos. 3 guesses. How far can you get?', '', 'Pause if you need to — no judgement 😅', cta],
    spoiler: 'Scroll for the answer ⬇️',
    tags: ['#travelquiz'],
  },
  {
    name: 'Real travellers',
    intro: () => ['Only real travellers get this one in round 1 ✈️', '', 'Comment your score BEFORE the answer shows up 👇'],
    spoiler: 'Still here? The answer is down there 👇',
    tags: ['#travelgram', '#wanderlust'],
  },
  {
    name: 'GeoGuessr challenge',
    intro: ({cta}) => ['🧭 GeoGuessr challenge: part of the world → region → exact spot.', '', 'Did you get all 3? 🏆', cta],
    spoiler: 'Answer ↓ (no cheating!)',
    tags: ['#geoguessrchallenge', '#maps'],
  },
  {
    name: 'Prove it',
    intro: ({seconds}) => ['Think you know the world? Prove it 👇', '', `⏱️ ${seconds} seconds per round. No Googling!`, 'Write your score in the comments 0–3'],
    spoiler: 'The answer (only if you finished!) ⬇️',
    tags: ['#geographyquiz', '#brainteaser'],
  },
  {
    name: 'One photo',
    intro: ({cta}) => ['📸 Can you name this place from just ONE photo?', '', 'It gets easier every round… 😏', cta],
    spoiler: 'Answer hidden below 🙈',
    tags: ['#photography', '#guesswhere'],
  },
  {
    name: 'Round 1 vs round 3',
    intro: () => ['Round 1 is hard. Round 3 is a giveaway. 🤔', '', 'In which round did you get it? Tell me 👇 1, 2, 3… or never 😂'],
    spoiler: 'No peeking — answer below ⬇️',
    tags: ['#quiztime'],
  },
  {
    name: 'Daily quiz',
    intro: ({cta}) => ["🗺️ Daily geography quiz — today's place might surprise you.", '', 'Tag a friend who would get it instantly 👯', cta],
    spoiler: "Today's answer ⬇️",
    tags: ['#dailyquiz', '#explore'],
  },
  {
    name: 'Been here?',
    intro: ({cta}) => ['Been here? Then this one should be easy 😉', '', "Drop a 📍 in the comments if you've visited!", cta],
    spoiler: 'Answer for the brave ⬇️',
    tags: ['#travelgram', '#bucketlist'],
  },
  {
    name: 'Score 0–3',
    intro: ({seconds}) => [`Guess the place — ${seconds} seconds a round ⏱️`, '', 'Your score: 0, 1, 2 or 3? Be honest 😄', 'Follow for a new place every day 🌍'],
    spoiler: 'Scroll down for the answer 👇',
    tags: ['#geography', '#funquiz'],
  },
];

/** Style used when the project has none saved: varies with the seed so posts don't all look the same. */
export const defaultCaptionStyle = (props: Pick<VideoProps, 'seed'>) => Math.abs(props.seed) % CAPTION_STYLES.length;

/**
 * Post text (English) for the reel. Instagram/Facebook have no spoiler markup, so the answer
 * is pushed below the "…more" fold with dot lines and doesn't spoil the video in the feed.
 */
export function buildCaption(props: VideoProps, styleIndex = props.captionStyle ?? defaultCaptionStyle(props)): string {
  const style = CAPTION_STYLES[((styleIndex % CAPTION_STYLES.length) + CAPTION_STYLES.length) % CAPTION_STYLES.length];
  const {place} = props;
  const tags = ['#geography', '#geoguessr', '#travel', '#guesstheplace', '#quiz', ...style.tags];
  if (place.country) tags.push(tag(place.country));
  if (place.name && place.name !== place.country) tags.push(tag(place.name));

  const intro = style.intro({seconds: props.thinkSeconds, cta: props.texts.cta.trim()});
  while (intro.length && !intro[intro.length - 1]) intro.pop(); // empty ending question

  return [
    ...intro,
    '',
    style.spoiler,
    '.',
    '.',
    '.',
    '.',
    '.',
    `✅ ${place.name}${place.country && place.country !== place.name ? `, ${place.country}` : ''}`,
    ...credits(props),
    '',
    [...new Set(tags)].join(' '),
  ].join('\n');
}
