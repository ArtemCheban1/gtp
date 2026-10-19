import {countryLabel} from './geo/countries';
import type {PhotoSlot, VideoFormat, VideoProps} from './types';

const tag = (s: string) =>
  '#' +
  s
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9]+/g, '')
    .toLowerCase();

/** Photos used by the current format (rapid: its photo rounds; pan: the first photo). */
function usedPhotos(props: VideoProps): PhotoSlot[] {
  if (props.format === 'rapid') return (props.rapid?.rounds ?? []).flatMap((r) => (r.kind === 'photo' ? [r] : []));
  if (props.format === 'pan') return props.photos.slice(0, 1);
  return props.photos;
}

/** "📷 Photos: …" line for photos that carry a credit (required by CC BY / CC BY-SA). */
function credits(props: VideoProps): string[] {
  const list = [...new Set(usedPhotos(props).map((p) => p.credit?.trim()).filter((c): c is string => !!c))];
  return list.length ? ['', `📷 Photos: ${list.join('; ')}`] : [];
}

type Style = {
  name: string;
  /** Lines above the fold: hook + call to comment. `cta` is the ending question from the video settings. */
  intro: (s: {seconds: number; cta: string; rounds: number}) => string[];
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

export const RAPID_STYLES: Style[] = [
  {
    name: 'Score /N',
    intro: ({rounds, seconds}) => [`🌍 ${rounds} countries, ${seconds} seconds each. How many can you name?`, '', 'Comment your score 👇'],
    spoiler: 'All answers below ⬇️',
    tags: ['#guessthecountry', '#mapquiz'],
  },
  {
    name: 'No pausing',
    intro: ({rounds}) => [`Name all ${rounds} countries without pausing ⏱️`, '', 'Be honest — what did you get? 😅'],
    spoiler: 'Answers (no cheating!) ⬇️',
    tags: ['#geographyquiz', '#countries'],
  },
  {
    name: 'Easy → impossible',
    intro: () => ['It starts easy… the last ones are brutal 😈', '', 'At which round did you lose? Tell me 👇'],
    spoiler: 'The answers ⬇️',
    tags: ['#mapquiz', '#geographychallenge'],
  },
  {
    name: 'Perfect score?',
    intro: ({rounds}) => [`Only 1% get ${rounds}/${rounds} 🏆`, '', 'Did you? Prove it in the comments 👇'],
    spoiler: 'Check your answers ⬇️',
    tags: ['#guessthecountry', '#brainteaser'],
  },
  {
    name: 'Map nerds',
    intro: () => ['Calling all map nerds 🗺️', '', 'Name the highlighted country before the timer hits 0!', 'Comment your score 👇'],
    spoiler: 'Answers ⬇️',
    tags: ['#mapnerd', '#maps'],
  },
  {
    name: 'Daily rapid',
    intro: ({rounds}) => [`Daily rapid round — ${rounds} countries ⚡`, '', 'Tag a friend and compare scores 👯'],
    spoiler: "Today's answers ⬇️",
    tags: ['#dailyquiz', '#geographyquiz'],
  },
];

export const PAN_STYLES: Style[] = [
  {
    name: 'Do you know it?',
    intro: () => ['Do you know this city? 🏙️', '', 'Comment your guess 👇'],
    spoiler: 'Answer below — no peeking 🙈',
    tags: ['#guessthecity', '#citylife'],
  },
  {
    name: 'Locals only',
    intro: () => ['Only locals will recognise this place 👀', '', 'Where is it? Drop your guess 👇'],
    spoiler: 'Answer ⬇️',
    tags: ['#guessthecity', '#hiddengems'],
  },
  {
    name: 'Been here?',
    intro: () => ['Have you been here? 📍', '', 'Comment the city — first correct answer gets pinned 📌'],
    spoiler: 'The answer ⬇️',
    tags: ['#travelgram', '#bucketlist'],
  },
  {
    name: 'One look',
    intro: () => ['One look — can you name the city? 🤔', '', 'Answers in the comments 👇'],
    spoiler: 'Scroll for the answer ⬇️',
    tags: ['#guesswhere', '#cityview'],
  },
  {
    name: 'Next trip',
    intro: () => ['Your next trip? ✈️ But first — where is this?', '', 'Comment your guess 👇'],
    spoiler: 'Answer for the curious ⬇️',
    tags: ['#wanderlust', '#travelinspo'],
  },
  {
    name: 'Daily city',
    intro: () => ['Daily city challenge 🌍', '', 'Name it in the comments 👇', 'Follow for a new one every day'],
    spoiler: "Today's answer ⬇️",
    tags: ['#dailyquiz', '#guessthecity'],
  },
];

/** Caption styles available for a format. */
export const captionStyles = (format: VideoFormat | undefined): Style[] =>
  format === 'rapid' ? RAPID_STYLES : format === 'pan' ? PAN_STYLES : CAPTION_STYLES;

/** Style used when the project has none saved: varies with the seed so posts don't all look the same. */
export const defaultCaptionStyle = (props: Pick<VideoProps, 'seed' | 'format'>) =>
  Math.abs(props.seed) % captionStyles(props.format).length;

/**
 * Post text (English) for the reel. Instagram/Facebook have no spoiler markup, so the answer
 * is pushed below the "…more" fold with dot lines and doesn't spoil the video in the feed.
 */
export function buildCaption(props: VideoProps, styleIndex = props.captionStyle ?? defaultCaptionStyle(props)): string {
  const styles = captionStyles(props.format);
  const style = styles[((styleIndex % styles.length) + styles.length) % styles.length];
  const {place} = props;
  const rapid = props.format === 'rapid';
  const tags = ['#geography', '#geoguessr', '#travel', '#guesstheplace', '#quiz', ...style.tags];
  if (!rapid) {
    if (place.country) tags.push(tag(place.country));
    if (place.name && place.name !== place.country) tags.push(tag(place.name));
  }

  const rounds = props.rapid?.rounds ?? [];
  const intro = style.intro({
    seconds: rapid ? props.rapid?.seconds ?? 3 : props.thinkSeconds,
    cta: props.texts.cta.trim(),
    rounds: rounds.length,
  });
  while (intro.length && !intro[intro.length - 1]) intro.pop(); // empty ending question
  // "Ep. 12" rather than "#12", which Instagram would turn into a hashtag
  if (props.episode && intro.length) intro[0] = `Ep. ${props.episode} · ${intro[0]}`;

  const answer = rapid
    ? rounds.map((r, i) => `${i + 1}. ${r.kind === 'country' ? countryLabel(r.country) : r.answer || '?'}`)
    : [`✅ ${place.name}${place.country && place.country !== place.name ? `, ${place.country}` : ''}`];

  return [...intro, '', style.spoiler, '.', '.', '.', '.', '.', ...answer, ...credits(props), '', [...new Set(tags)].join(' ')].join('\n');
}
