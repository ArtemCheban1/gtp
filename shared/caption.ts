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

/**
 * Post text (English) for the reel. Instagram/Facebook have no spoiler markup, so the answer
 * is pushed below the "…more" fold with dot lines and doesn't spoil the video in the feed.
 */
export function buildCaption(props: VideoProps): string {
  const {place} = props;
  const tags = ['#geography', '#geoguessr', '#travel', '#guesstheplace', '#quiz'];
  if (place.country) tags.push(tag(place.country));
  if (place.name && place.name !== place.country) tags.push(tag(place.name));

  return [
    `📍 Where is this? ${props.thinkSeconds} seconds per photo — can you get it before the reveal?`,
    '',
    'Answer in the video 👀',
    props.texts.cta,
    '',
    'Answer below — no peeking 🙈',
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
