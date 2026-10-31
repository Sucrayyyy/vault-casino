// Hand-made SVG illustrations for the lobby tiles (150×200).

const shade = (hex, amt) => {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) + amt, g = ((n >> 8) & 255) + amt, b = (n & 255) + amt;
  r = Math.max(0, Math.min(255, r)); g = Math.max(0, Math.min(255, g)); b = Math.max(0, Math.min(255, b));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
};

function frame(id, color, art, title, tag = 'VAULT ORIGINALS') {
  const big = title.length > 11 ? 14 : title.length > 7 ? 17 : 21;
  return `<svg viewBox="0 0 150 200" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg-${id}" x1="0" y1="0" x2="0.3" y2="1"><stop offset="0" stop-color="${shade(color, 40)}"/><stop offset="1" stop-color="${shade(color, -45)}"/></linearGradient>
    <radialGradient id="gl-${id}" cx=".5" cy=".42" r=".55"><stop offset="0" stop-color="#fff" stop-opacity=".35"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
    <linearGradient id="sh-${id}" x1="0" y1="0" x2="0" y2="1"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".55"/></linearGradient>
  </defs>
  <rect width="150" height="200" fill="url(#bg-${id})"/>
  <g opacity=".12" stroke="#fff" stroke-width="1">${Array.from({ length: 9 }, (_, i) => `<line x1="${-60 + i * 30}" y1="0" x2="${i * 30 + 40}" y2="200"/>`).join('')}</g>
  <circle cx="75" cy="84" r="80" fill="url(#gl-${id})"/>
  <g>${art}</g>
  <rect width="150" height="200" fill="url(#sh-${id})"/>
  <text x="75" y="172" text-anchor="middle" font-family="Inter,system-ui" font-weight="900" font-style="italic" font-size="${big}" fill="#fff" style="paint-order:stroke" stroke="rgba(0,0,0,.25)" stroke-width="3">${title.toUpperCase()}</text>
  <text x="75" y="188" text-anchor="middle" font-family="Inter,system-ui" font-weight="800" font-size="7" letter-spacing="1.5" fill="#fff" opacity=".7">${tag}</text>
</svg>`;
}

const die = (x, y, s, rot, pips) => {
  const P = { 1: [[0.5, 0.5]], 2: [[0.28, 0.28], [0.72, 0.72]], 3: [[0.25, 0.25], [0.5, 0.5], [0.75, 0.75]], 4: [[0.28, 0.28], [0.72, 0.28], [0.28, 0.72], [0.72, 0.72]], 5: [[0.25, 0.25], [0.75, 0.25], [0.5, 0.5], [0.25, 0.75], [0.75, 0.75]], 6: [[0.28, 0.22], [0.72, 0.22], [0.28, 0.5], [0.72, 0.5], [0.28, 0.78], [0.72, 0.78]] };
  return `<g transform="translate(${x} ${y}) rotate(${rot})"><rect x="${-s / 2}" y="${-s / 2 + 5}" width="${s}" height="${s}" rx="${s * 0.2}" fill="rgba(0,0,0,.3)"/><rect x="${-s / 2}" y="${-s / 2}" width="${s}" height="${s}" rx="${s * 0.2}" fill="#fff"/><rect x="${-s / 2}" y="${-s / 2}" width="${s}" height="${s * 0.5}" rx="${s * 0.2}" fill="#fff" opacity=".6"/>${P[pips].map(([a, b]) => `<circle cx="${-s / 2 + a * s}" cy="${-s / 2 + b * s}" r="${s * 0.085}" fill="#1a2c38"/>`).join('')}</g>`;
};

const card = (x, y, rot, rank, suit, red) => `<g transform="translate(${x} ${y}) rotate(${rot})"><rect x="-22" y="-30" width="44" height="62" rx="5" fill="rgba(0,0,0,.3)" transform="translate(2 4)"/><rect x="-22" y="-30" width="44" height="62" rx="5" fill="#fff"/><text x="-16" y="-14" font-family="Inter" font-weight="900" font-size="14" fill="${red ? '#e11d48' : '#1a2c38'}">${rank}</text><text x="0" y="16" text-anchor="middle" font-size="26" fill="${red ? '#e11d48' : '#1a2c38'}">${suit}</text></g>`;

const gem = (x, y, s) => `<g transform="translate(${x} ${y}) scale(${s})"><polygon points="-20,-8 -10,-20 10,-20 20,-8 0,22" fill="#3ee0ff"/><polygon points="-20,-8 20,-8 0,22" fill="#0ea5e9"/><polygon points="-10,-20 -4,-8 4,-8 10,-20" fill="#a5f3fc"/><polygon points="-20,-8 -4,-8 0,22" fill="#38bdf8"/><polygon points="-4,-8 4,-8 0,22" fill="#7dd3fc"/></g>`;

const ART = {
  dice: () => die(52, 78, 50, -14, 5) + die(100, 96, 42, 16, 3),
  mines: () => `${gem(75, 80, 2.2)}<g transform="translate(112 118)"><circle r="16" fill="#111"/><circle r="16" fill="url(#gl-mines)" opacity=".4"/><rect x="-3" y="-23" width="6" height="8" fill="#555"/><path d="M0-23 q6-8 12-4" stroke="#f59e0b" stroke-width="2" fill="none"/><circle cx="12" cy="-27" r="3" fill="#fde047"/></g>`,
  limbo: () => `<g transform="translate(75 82)"><path d="M0-50 l14 22h-8v40h-12v-40h-8z" fill="#fff" opacity=".95"/><text y="40" text-anchor="middle" font-family="Inter" font-weight="900" font-size="30" fill="#fff" style="paint-order:stroke" stroke="#3b0d8f" stroke-width="5">2.00×</text>${[[-50, -40], [48, -30], [-40, 10], [52, 18], [-20, -56], [30, -56]].map(([a, b]) => `<circle cx="${a}" cy="${b}" r="2" fill="#fff"/>`).join('')}</g>`,
  plinko: () => {
    let s = '';
    for (let r = 0; r < 6; r++) for (let c = 0; c <= r + 2; c++) s += `<circle cx="${75 - (r + 2) * 9 + c * 18}" cy="${38 + r * 17}" r="3" fill="#fff" opacity=".9"/>`;
    const cols = ['#ff003f', '#ff4b2b', '#ff8a00', '#ffc400', '#ff8a00', '#ff4b2b', '#ff003f'];
    s += cols.map((c, i) => `<rect x="${75 - 3.5 * 18 + i * 18 + 1}" y="142" width="16" height="10" rx="2" fill="${c}"/>`).join('');
    return s + `<circle cx="84" cy="64" r="8" fill="#ff2d75" stroke="#fff" stroke-width="2"/>`;
  },
  hilo: () => card(56, 80, -12, 'K', '♠') + card(96, 86, 12, 'Q', '♥', true) + `<path d="M75 26 l12 14h-24z" fill="#00e701"/><path d="M75 142 l12-14h-24z" fill="#ff4d4d"/>`,
  keno: () => {
    let s = '';
    for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
      const n = r * 4 + c + 1, hit = [2, 7, 9, 12, 14].includes(n);
      s += `<rect x="${31 + c * 23}" y="${36 + r * 23}" width="20" height="20" rx="4" fill="${hit ? '#00e701' : 'rgba(255,255,255,.2)'}"/>${hit ? `<text x="${41 + c * 23}" y="${50 + r * 23}" text-anchor="middle" font-family="Inter" font-weight="900" font-size="10" fill="#063">${n}</text>` : ''}`;
    }
    return s;
  },
  crash: () => `<path d="M14 140 Q 80 136 130 46" stroke="#fff" stroke-width="4" fill="none" stroke-linecap="round" opacity=".9"/><path d="M14 140 Q 80 136 130 46 L130 150 L14 150z" fill="#fff" opacity=".12"/><g transform="translate(118 58) rotate(-52)"><path d="M-20 0 Q-18 -6 0 -6 L22 -3 Q28 0 22 3 L0 6 Q-18 6 -20 0z" fill="#fff"/><path d="M-4 -5 L-12 -22 L-4 -22 L8 -5z" fill="#e5e7eb"/><path d="M-4 5 L-12 22 L-4 22 L8 5z" fill="#e5e7eb"/><path d="M-18 -2 L-26 -12 L-21 -12 L-14 -3z" fill="#ef4444"/><circle cx="14" cy="-1" r="2.4" fill="#60a5fa"/></g><text x="40" y="70" font-family="Inter" font-weight="900" font-size="24" fill="#fff">8.42×</text>`,
  chicken: () => `<rect x="0" y="108" width="150" height="40" fill="#2b2b34"/><g fill="#fff" opacity=".7">${[10, 40, 70, 100, 130].map((x) => `<rect x="${x}" y="126" width="16" height="3"/>`).join('')}</g><g transform="translate(75 82)"><ellipse cx="0" cy="44" rx="22" ry="5" fill="rgba(0,0,0,.3)"/><path d="M-8 30 l-3 12 M8 30 l3 12" stroke="#f59e0b" stroke-width="4" stroke-linecap="round"/><ellipse cx="0" cy="8" rx="28" ry="27" fill="#fff"/><path d="M-18 14 q-14 2 -12 -10 q8 4 12 4z" fill="#f3f4f6"/><circle cx="8" cy="-26" r="16" fill="#fff"/><path d="M0 -42 q4 -10 8 -2 q4 -10 8 -1 q6 -6 6 4 z" fill="#ef4444"/><path d="M20 -26 l12 4 -12 4z" fill="#f59e0b"/><circle cx="14" cy="-30" r="3" fill="#111"/><path d="M20 -16 q2 8 -4 8 q-4 -4 4 -8z" fill="#ef4444"/></g>`,
  wheel: () => {
    const cols = ['#00e701', '#1f2937', '#ffc800', '#1f2937', '#ff2d75', '#1f2937', '#1475e1', '#1f2937', '#8847ff', '#1f2937', '#ff8a00', '#1f2937'];
    let s = '<g transform="translate(75 88)">';
    cols.forEach((c, i) => {
      const a0 = (i / 12) * Math.PI * 2, a1 = ((i + 1) / 12) * Math.PI * 2;
      s += `<path d="M0 0 L${Math.cos(a0) * 52} ${Math.sin(a0) * 52} A52 52 0 0 1 ${Math.cos(a1) * 52} ${Math.sin(a1) * 52}z" fill="${c}"/>`;
    });
    return s + `<circle r="52" fill="none" stroke="#fff" stroke-width="5"/><circle r="12" fill="#fff"/><circle r="5" fill="#1a2c38"/><path d="M0 -50 l-9 -16 h18z" fill="#fff" stroke="#1a2c38" stroke-width="2"/></g>`;
  },
  blackjack: () => card(60, 82, -10, 'A', '♠') + card(92, 84, 10, 'K', '♥', true) + `<g transform="translate(110 132)"><ellipse rx="16" ry="6" fill="#111" opacity=".4" cy="4"/><ellipse rx="16" ry="6" fill="#ef4444"/><ellipse rx="16" ry="6" fill="#ef4444" cy="-5"/><ellipse rx="10" ry="3.5" fill="none" stroke="#fff" stroke-dasharray="3 3" cy="-5"/></g>`,
  tower: () => {
    let s = '';
    for (let r = 0; r < 5; r++) for (let c = 0; c < 3; c++) {
      const egg = (r === 1 && c === 0) || (r === 3 && c === 2);
      s += `<rect x="${32 + c * 30}" y="${30 + r * 24}" width="26" height="20" rx="4" fill="${r < 2 ? 'rgba(255,255,255,.18)' : r === 2 && c === 1 ? '#ef4444' : '#00e701'}" opacity="${r < 2 ? 1 : 0.9}"/>${egg && r > 2 ? '' : ''}`;
    }
    return s + `<g transform="translate(75 40)"><path d="M-14 6 q14 -24 28 0 q-14 10 -28 0z" fill="#fbbf24"/><circle r="4" fill="#111"/><path d="M-1 -4 v8" stroke="#fbbf24" stroke-width="1.5"/></g>`;
  },
  roulette: () => {
    let s = '<g transform="translate(75 86)">';
    for (let i = 0; i < 18; i++) {
      const a0 = (i / 18) * Math.PI * 2, a1 = ((i + 1) / 18) * Math.PI * 2;
      const c = i === 0 ? '#16a34a' : i % 2 ? '#dc2626' : '#111827';
      s += `<path d="M0 0 L${Math.cos(a0) * 54} ${Math.sin(a0) * 54} A54 54 0 0 1 ${Math.cos(a1) * 54} ${Math.sin(a1) * 54}z" fill="${c}"/>`;
    }
    return s + `<circle r="54" fill="none" stroke="#c9a227" stroke-width="5"/><circle r="30" fill="#5b3a1a"/><circle r="30" fill="none" stroke="#c9a227" stroke-width="2"/><path d="M0-22 v44 M-22 0 h44" stroke="#c9a227" stroke-width="4" stroke-linecap="round"/><circle r="6" fill="#c9a227"/><circle cx="34" cy="-30" r="5" fill="#fff"/></g>`;
  },
  slots: () => `<rect x="20" y="40" width="110" height="78" rx="10" fill="#1a0b2e" stroke="#ffc800" stroke-width="3"/>${[0, 1, 2].map((i) => `<rect x="${28 + i * 33}" y="48" width="29" height="62" rx="5" fill="#fff"/>`).join('')}<g transform="translate(29 66) scale(.42)"><path d="M30 8c-6 8-12 14-16 26M30 8c4 8 10 16 18 22" stroke="#3f7d20" stroke-width="4" fill="none"/><circle cx="16" cy="44" r="12" fill="#d1122f"/><circle cx="46" cy="40" r="12" fill="#e11d48"/></g><text x="75" y="90" text-anchor="middle" font-family="Inter" font-weight="900" font-size="26" fill="#e11d48">7</text><g transform="translate(95 68) scale(.42)"><ellipse cx="32" cy="34" rx="24" ry="18" fill="#facc15" transform="rotate(-20 32 34)"/></g><path d="M20 79h110" stroke="#ff2d75" stroke-width="2" opacity=".8"/>`,
  cases: () => `<g transform="translate(75 88)"><path d="M-50 -20 L0 -40 L50 -20 L0 0z" fill="#fbbf24"/><path d="M-50 -20 L0 0 L0 46 L-50 26z" fill="#d97706"/><path d="M50 -20 L0 0 L0 46 L50 26z" fill="#b45309"/><path d="M-50 -6 L0 14 L50 -6" stroke="#1f2937" stroke-width="5" fill="none" opacity=".75"/><path d="M-25 -30 L25 -10" stroke="#1f2937" stroke-width="5" opacity=".6"/><rect x="-8" y="10" width="16" height="12" rx="2" fill="#374151" transform="skewY(22)"/></g>`,
  upgrader: () => `<g transform="translate(75 86)"><circle r="46" fill="none" stroke="rgba(255,255,255,.2)" stroke-width="12"/><path d="M0 -46 A46 46 0 0 1 43.7 14.2" stroke="#00e701" stroke-width="12" fill="none" stroke-linecap="round"/><path d="M0 18 v-38 m-14 14 l14 -14 14 14" stroke="#fff" stroke-width="7" fill="none" stroke-linecap="round" stroke-linejoin="round"/><text y="40" text-anchor="middle" font-family="Inter" font-weight="900" font-size="13" fill="#fff">32%</text></g>`,
  battles: () => `<g transform="translate(75 84)"><g transform="rotate(45)"><rect x="-4" y="-56" width="8" height="70" rx="2" fill="#e5e7eb"/><rect x="-14" y="12" width="28" height="6" rx="3" fill="#fbbf24"/><rect x="-3" y="18" width="6" height="18" fill="#7c2d12"/></g><g transform="rotate(-45)"><rect x="-4" y="-56" width="8" height="70" rx="2" fill="#e5e7eb"/><rect x="-14" y="12" width="28" height="6" rx="3" fill="#fbbf24"/><rect x="-3" y="18" width="6" height="18" fill="#7c2d12"/></g><text y="58" text-anchor="middle" font-family="Inter" font-weight="900" font-style="italic" font-size="26" fill="#fff" style="paint-order:stroke" stroke="#7f1d1d" stroke-width="5">VS</text></g>`,
  boosters: () => `<g transform="translate(75 86) rotate(-8)"><rect x="-34" y="-56" width="68" height="112" rx="6" fill="#111827"/><rect x="-34" y="-56" width="68" height="112" rx="6" fill="url(#gl-boosters)" opacity=".6"/><path d="M-34 -46 h68 M-34 46 h68" stroke="#fff" stroke-width="1.5" stroke-dasharray="3 3" opacity=".6"/><circle cy="-4" r="24" fill="#fbbf24"/><path d="M-6 -22 l10 12 -8 2 12 16" stroke="#111827" stroke-width="4" fill="none" stroke-linejoin="round"/><text y="38" text-anchor="middle" font-family="Inter" font-weight="900" font-size="10" fill="#fff">BOOSTER</text></g>`,
  etb: () => `<g transform="translate(75 92)"><path d="M-48 -26 L0 -44 L48 -26 L0 -8z" fill="#c4b5fd"/><path d="M-48 -26 L0 -8 L0 42 L-48 24z" fill="#7c3aed"/><path d="M48 -26 L0 -8 L0 42 L48 24z" fill="#5b21b6"/><circle cx="-24" cy="10" r="11" fill="#fde047" opacity=".9"/><text x="24" y="14" text-anchor="middle" font-family="Inter" font-weight="900" font-size="11" fill="#fff" transform="skewY(-20)">ETB</text></g>`,
  display: () => `<g transform="translate(75 92)"><rect x="-52" y="-30" width="104" height="62" rx="4" fill="#0c4a6e"/><path d="M-52 -30 L-40 -48 H40 L52 -30z" fill="#0284c7"/>${[0, 1, 2, 3, 4, 5].map((i) => `<rect x="${-46 + i * 16}" y="-42" width="13" height="44" rx="2" fill="${['#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#a855f7', '#ec4899'][i]}"/>`).join('')}<text y="22" text-anchor="middle" font-family="Inter" font-weight="900" font-size="11" fill="#fff">36 BOOSTERS</text></g>`,
  grading: () => `<g transform="translate(75 88)"><rect x="-38" y="-58" width="76" height="116" rx="6" fill="#e5e7eb" opacity=".9"/><rect x="-32" y="-52" width="64" height="18" rx="2" fill="#dc2626"/><text y="-39" text-anchor="middle" font-family="Inter" font-weight="900" font-size="11" fill="#fff">GEM MT 10</text><rect x="-28" y="-28" width="56" height="78" rx="3" fill="#fbbf24"/><rect x="-24" y="-24" width="48" height="36" fill="#60a5fa"/><circle cy="-6" r="10" fill="#fde047"/></g>`,
};

const TAGS = { cases: 'CS • CAISSES', upgrader: 'CS • SKINS', battles: 'CS • VS IA', boosters: 'POKÉMON TCG', etb: 'POKÉMON TCG', display: 'POKÉMON TCG', grading: 'POKÉMON TCG', blackjack: 'JEU DE TABLE', roulette: 'JEU DE TABLE', slots: 'MACHINE À SOUS' };

export function thumb(g) {
  const art = ART[g.id] ? ART[g.id]() : '';
  return frame(g.id, g.color, art, g.name, TAGS[g.id]);
}
