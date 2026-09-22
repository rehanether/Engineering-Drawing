import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

const PRESETS = {
  evaporator: {
    name: 'MVR evaporator concept',
    description: 'Feed conditioning, evaporation loop, vapor compression, and concentrated-product handling.',
    route: '/evaporators',
    routeLabel: 'Open MVR 3D plant',
  },
  reactor: {
    name: 'Reactor train concept',
    description: 'Feed preparation, controlled reaction, heat management, and downstream separation.',
    route: '/reactors',
    routeLabel: 'Open reactor 3D plant',
  },
  distillation: {
    name: 'Distillation concept',
    description: 'Feed conditioning, column separation, reflux, and overhead and bottoms handling.',
    route: '/distillation',
    routeLabel: 'Open column 3D plant',
  },
  plant: {
    name: 'Industrial plant concept',
    description: 'A visual starting point for equipment, process flow, utilities, and operating goals.',
    route: '/workspace',
    routeLabel: 'Open design workspace',
  },
};

export function visionForPrompt(prompt = '') {
  const text = prompt.toLowerCase();
  if (/evaporat|mvr|concentrat|wastewater|brine/.test(text)) return 'evaporator';
  if (/reactor|cstr|pfr|kinetic|polymer|synthes/.test(text)) return 'reactor';
  if (/distill|column|separat|reflux|fractionat/.test(text)) return 'distillation';
  return 'plant';
}

function IsometricPlant({ kind, view, label }) {
  const active = view === 'all' ? '' : ` show-${view}`;
  const center = kind === 'distillation'
    ? <g className="vision-core"><ellipse cx="174" cy="38" rx="25" ry="9" fill="#dbeafe" stroke="#2563eb" strokeWidth="2" /><path d="M149 39v90c0 6 11 10 25 10s25-4 25-10V39" fill="#93c5fd" stroke="#2563eb" strokeWidth="2" /><ellipse cx="174" cy="129" rx="25" ry="9" fill="#60a5fa" stroke="#2563eb" strokeWidth="2" /><path d="M154 62h40M154 84h40M154 106h40" stroke="#dbeafe" strokeWidth="3" /></g>
    : kind === 'reactor'
      ? <g className="vision-core"><ellipse cx="174" cy="58" rx="34" ry="14" fill="#dbeafe" stroke="#2563eb" strokeWidth="2" /><path d="M140 58v58c0 10 15 17 34 17s34-7 34-17V58" fill="#60a5fa" stroke="#2563eb" strokeWidth="2" /><ellipse cx="174" cy="116" rx="34" ry="14" fill="#3b82f6" stroke="#2563eb" strokeWidth="2" /><path d="M174 25v34M162 25h24" stroke="#0f3c8a" strokeWidth="4" strokeLinecap="round" /></g>
      : <g className="vision-core"><ellipse cx="174" cy="55" rx="36" ry="14" fill="#dbeafe" stroke="#2563eb" strokeWidth="2" /><path d="M138 56v57c0 12 16 20 36 20s36-8 36-20V56" fill="#93c5fd" stroke="#2563eb" strokeWidth="2" /><ellipse cx="174" cy="113" rx="36" ry="14" fill="#60a5fa" stroke="#2563eb" strokeWidth="2" /><path d="M145 78h58M154 45v-24h40v24" fill="none" stroke="#0f3c8a" strokeWidth="3" /></g>;

  return (
    <svg className={`ai-vision-graphic${active}`} viewBox="0 0 330 178" role="img" aria-label={label}>
      <path d="M28 142l104-60 171 0-104 61z" fill="#eff6ff" stroke="#bfdbfe" />
      <path d="M62 142l104-60M105 156l104-61M150 162l104-60M55 121l171 0M44 132l171 0" stroke="#dbeafe" strokeWidth="1" />
      <g className="vision-feed"><ellipse cx="72" cy="90" rx="23" ry="9" fill="#d1fae5" stroke="#059669" strokeWidth="2" /><path d="M49 90v37c0 6 10 10 23 10s23-4 23-10V90" fill="#6ee7b7" stroke="#059669" strokeWidth="2" /><ellipse cx="72" cy="127" rx="23" ry="9" fill="#34d399" stroke="#059669" strokeWidth="2" /><path d="M60 72v18M84 72v18" stroke="#047857" strokeWidth="3" /></g>
      {center}
      <g className="vision-product"><ellipse cx="271" cy="93" rx="22" ry="8" fill="#fef3c7" stroke="#d97706" strokeWidth="2" /><path d="M249 93v35c0 6 10 10 22 10s22-4 22-10V93" fill="#fbbf24" stroke="#d97706" strokeWidth="2" /><ellipse cx="271" cy="128" rx="22" ry="8" fill="#f59e0b" stroke="#d97706" strokeWidth="2" /></g>
      <g className="vision-pipes" fill="none" stroke="#0f3c8a" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"><path d="M95 105h28l17-20" /><path d="M208 105h22l19-18" /><path d="M174 139v15h77" /></g>
      <g className="vision-markers" fill="#0f3c8a"><circle cx="125" cy="105" r="4" /><circle cx="231" cy="105" r="4" /><circle cx="251" cy="154" r="4" /></g>
      <text x="38" y="170">FEED</text><text x="154" y="170">{kind === 'distillation' ? 'SEPARATE' : kind === 'reactor' ? 'REACT' : 'PROCESS'}</text><text x="260" y="170">OUTPUT</text>
    </svg>
  );
}

export default function AiVisionPreview({ prompt, onUseProject }) {
  const [view, setView] = useState('all');
  const kind = useMemo(() => visionForPrompt(prompt), [prompt]);
  const vision = PRESETS[kind];

  return (
    <aside className="ai-vision-card" aria-label="EDG AI visual design concept">
      <div className="ai-vision-heading"><span>EDG AI VISION</span><b>Reimagine in 3D</b><i>Concept stage</i></div>
      <IsometricPlant kind={kind} view={view} label={`${vision.name} visual concept`} />
      <div className="ai-vision-copy"><strong>{vision.name}</strong><p>{vision.description}</p></div>
      <div className="ai-vision-views" role="group" aria-label="Preview focus">
        {['all', 'equipment', 'flow'].map((option) => <button type="button" className={view === option ? 'is-selected' : ''} key={option} onClick={() => setView(option)}>{option === 'all' ? 'Plant' : option}</button>)}
      </div>
      <div className="ai-vision-actions"><button type="button" onClick={onUseProject}>Build this brief <span aria-hidden="true">→</span></button><Link to={vision.route}>{vision.routeLabel}</Link></div>
      <small>Visual concept only — validate process design, safety, and construction details with qualified engineers.</small>
    </aside>
  );
}
