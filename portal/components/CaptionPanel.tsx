import React, {useMemo, useState} from 'react';
import {buildCaption} from '../../shared/caption';
import type {VideoProps} from '../../shared/types';

/** Ready-to-paste post text with hashtags. */
export const CaptionPanel: React.FC<{props: VideoProps}> = ({props}) => {
  const generated = useMemo(() => buildCaption(props), [props]);
  const [edited, setEdited] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const text = edited ?? generated;

  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <section className="card">
      <h2>Post caption</h2>
      <textarea className="caption" rows={9} value={text} onChange={(e) => setEdited(e.target.value)} />
      <div className="row tight">
        <button className="primary" onClick={copy}>
          {copied ? 'Copied ✓' : 'Copy caption'}
        </button>
        {edited !== null ? <button onClick={() => setEdited(null)}>Regenerate</button> : null}
      </div>
    </section>
  );
};
