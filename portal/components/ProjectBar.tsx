import React, {useEffect, useState} from 'react';
import {DEFAULT_PROPS} from '../../shared/defaults';
import type {VideoProps} from '../../shared/types';
import {listProjects, loadProject, saveProject} from '../api';

type Props = {
  props: VideoProps;
  onLoad: (p: VideoProps) => void;
  onNew: () => void;
};

export const ProjectBar: React.FC<Props> = ({props, onLoad, onNew}) => {
  const [projects, setProjects] = useState<{id: string}[]>([]);
  const [msg, setMsg] = useState('');

  const refresh = () => listProjects().then(setProjects).catch(() => setProjects([]));
  useEffect(() => {
    refresh();
  }, []);

  const save = async () => {
    try {
      const {id} = await saveProject(props.place.name, props);
      setMsg(`Saved as "${id}"`);
      refresh();
    } catch (e) {
      setMsg((e as Error).message);
    }
    setTimeout(() => setMsg(''), 2500);
  };

  return (
    <div className="row tight">
      {msg ? <small>{msg}</small> : null}
      <select
        value=""
        onChange={async (e) => {
          if (e.target.value) onLoad({...DEFAULT_PROPS, ...(await loadProject(e.target.value))});
        }}
      >
        <option value="">Open project…</option>
        {projects.map((p) => (
          <option key={p.id} value={p.id}>
            {p.id}
          </option>
        ))}
      </select>
      <button onClick={save}>Save</button>
      <button onClick={onNew}>New</button>
    </div>
  );
};
