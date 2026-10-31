import { S, settings, placeBet, settle, fair, addItems, track, ach, uid, round2, lucky } from '../store.js';
import { $, $$, el, css, money, fmt, sleep, confetti, haptic, segmented, esc } from '../ui.js';
import { sfx } from '../audio.js';
import { CASES, ITEMS, RAR, rollCase } from './data.js';
import { caseImg, skinCard, skinImg } from './art.js';
import { icon } from '../icons.js';
import { makeSpinner } from './spinner.js';
import { randomBot, avatar } from '../bots.js';

const MODES = { '1v1': { n: 2, teams: false }, '1v1v1': { n: 3, teams: false }, '1v1v1v1': { n: 4, teams: false }, '2v2': { n: 4, teams: true } };

css('battles', `
.bt-case { display: flex; align-items: center; gap: 10px; background: var(--bg2); border-radius: 8px; padding: 6px 10px 6px 6px; }
.bt-case .case-img { width: 64px; flex: none; }
.bt-case .cnt { display: flex; align-items: center; gap: 6px; }
.bt-case .cnt button { width: 32px; height: 32px; border-radius: 6px; background: var(--bg4); font-size: 18px; font-weight: 900; }
.bt-case .cnt b { width: 22px; text-align: center; }
.bt-arena { display: flex; gap: 6px; padding: 8px; }
.bt-col { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 6px; }
.bt-col .who { display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 800; min-width: 0; background: var(--bg2); border-radius: 6px; padding: 6px; }
.bt-col .who span.n { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.bt-col .reel { height: 216px; }
.bt-col .tot { text-align: center; font-weight: 900; font-size: 13px; background: var(--bg2); border-radius: 6px; padding: 6px 2px; }
.bt-col.win .who, .bt-col.win .tot { background: rgba(0,231,1,.18); color: var(--green); }
.bt-col.lose { opacity: .5; }
.bt-col.teamA .who { box-shadow: inset 3px 0 0 #3b82f6; } .bt-col.teamB .who { box-shadow: inset 3px 0 0 #ef4444; }
.bt-col .got { display: flex; flex-direction: column; gap: 4px; }
.bt-col .got .mini { height: 30px; border-radius: 4px; background: var(--bg2); position: relative; display: flex; align-items: center; justify-content: center; border-bottom: 2px solid var(--rc); }
.bt-col .got .mini img { height: 86%; width: 86%; object-fit: contain; }
.bt-col .waiting { height: 216px; border-radius: 8px; border: 2px dashed var(--line); display: grid; place-items: center; color: var(--txt3); font-size: 11px; }
.bt-head { display: flex; align-items: center; gap: 10px; padding: 8px 12px; background: var(--bg2); }
.bt-head .case-img { width: 50px; }
.bt-rounds { display: flex; gap: 4px; padding: 0 12px; overflow-x: auto; }
.bt-rounds .rd { flex: none; width: 40px; opacity: .4; }
.bt-rounds .rd.on { opacity: 1; }
.bt-rounds .rd.done { opacity: .7; filter: grayscale(.7); }
`);

export function mount(root) {
  let mode = '1v1', crazy = false;
  const picks = new Map(); // caseId -> count
  let alive = true;

  function setup() {
    root.innerHTML = `<div class="page">
      <div class="h1">Case Battles</div>
      <div class="muted" style="font-size:12.5px;margin-bottom:12px">Ouvre les mêmes caisses que des bots. Le plus gros total remporte <b>tous</b> les skins.</div>
      <div class="label">Mode</div><div data-mode></div>
      <div class="li" style="margin-top:10px" data-crazy><div class="tx"><b>Mode Crazy</b><small>Le plus PETIT total gagne</small></div><div class="switch ${crazy ? 'on' : ''}"></div></div>
      <div class="sec-head" style="margin-top:16px"><div class="h2">Caisses</div><span class="more" data-rc></span></div>
      <div class="col" data-cases></div>
      <div class="sticky-bar" style="margin:12px -12px 0"><button class="btn green full lg" data-create></button></div>
    </div>`;
    const ms = segmented(Object.keys(MODES).map((v) => ({ v, l: v })), mode, (v) => { mode = v; upd(); }, 'sq');
    $('[data-mode]', root).append(ms.el);
    $('[data-crazy]', root).onclick = () => { crazy = !crazy; $('[data-crazy] .switch', root).classList.toggle('on', crazy); sfx.click(); };
    const list = $('[data-cases]', root);
    for (const c of CASES) {
      const row = el(`<div class="bt-case">${caseImg(c, 128)}<div class="grow"><b style="font-size:13px">${c.name}</b><div style="font-size:12px">${money(c.price)}</div></div><div class="cnt"><button data-d="-1">−</button><b data-n>0</b><button data-d="1">+</button></div></div>`);
      $$('[data-d]', row).forEach((b) => (b.onclick = () => {
        const cur = picks.get(c.id) || 0, tot = [...picks.values()].reduce((a, b) => a + b, 0);
        const nv = Math.max(0, cur + +b.dataset.d);
        if (nv > cur && tot >= 10) { sfx.error(); return; }
        nv ? picks.set(c.id, nv) : picks.delete(c.id);
        $('[data-n]', row).textContent = nv; sfx.click(); upd();
      }));
      $('[data-n]', row).textContent = picks.get(c.id) || 0;
      list.append(row);
    }
    const create = $('[data-create]', root);
    function upd() {
      const rounds = [...picks.values()].reduce((a, b) => a + b, 0);
      const cost = round2([...picks].reduce((a, [id, n]) => a + CASES.find((c) => c.id === id).price * n, 0));
      $('[data-rc]', root).textContent = `${rounds}/10 manches`;
      create.innerHTML = rounds ? `Créer la battle · ${money(cost)}` : 'Ajoute au moins une caisse';
      create.disabled = !rounds;
    }
    create.onclick = () => {
      const rounds = [];
      for (const c of CASES) for (let i = 0; i < (picks.get(c.id) || 0); i++) rounds.push(c);
      run(rounds);
    };
    upd();
  }

  async function run(rounds) {
    const M = MODES[mode];
    const cost = round2(rounds.reduce((a, c) => a + c.price, 0));
    if (!placeBet('battles', cost)) return;
    sfx.bet();
    const used = [];
    const players = Array.from({ length: M.n }, (_, i) => {
      if (i === 0) return { name: settings.name || 'Toi', me: true, items: [], total: 0 };
      const n = randomBot(used); used.push(n);
      return { name: n, items: [], total: 0 };
    });
    const team = (i) => (M.teams ? (i < 2 ? 'A' : 'B') : null);
    root.innerHTML = `<div>
      <div class="bt-head"><div data-hc></div><div class="grow"><b data-ht>En attente des joueurs…</b><div class="dim" style="font-size:11.5px">${mode}${crazy ? ' · Crazy' : ''} · ${rounds.length} manche(s) · ${money(cost)}/joueur</div></div></div>
      <div class="bt-rounds" style="margin-top:8px">${rounds.map((c, i) => `<div class="rd" data-r="${i}">${caseImg(c, 128)}</div>`).join('')}</div>
      <div class="bt-arena">${players.map((p, i) => `<div class="bt-col ${team(i) ? 'team' + team(i) : ''}" data-p="${i}"><div class="who">${avatar(p.name, 20)}<span class="n">${esc(p.name)}</span></div><div class="reel"><div class="waiting">${i === 0 ? 'Prêt' : 'Recherche…'}</div></div><div class="tot">${money(0)}</div><div class="got"></div></div>`).join('')}</div>
      <div data-end style="padding:0 12px 20px"></div></div>`;
    const cols = $$('.bt-col', root);
    // bots join
    for (let i = 1; i < players.length; i++) {
      await sleep(350 + Math.random() * 500);
      if (!alive) return;
      $('.waiting', cols[i]).textContent = 'Prêt';
      sfx.chip();
    }
    await sleep(400);
    // Everything is decided and paid up-front so leaving mid-animation never loses anything.
    const N = rounds.length * players.length * 4 + 1;
    const simulate = (fl) => {
      const allRes = rounds.map((c, r) => players.map((p, i) => { const k = (r * players.length + i) * 4; return { ...rollCase(c, fl[k], fl[k + 1], fl[k + 2], fl[k + 3]), id: uid(), src: 'Battle' }; }));
      const finalTot = players.map((_, i) => round2(allRes.reduce((a, row) => a + row[i].price, 0)));
      let winners;
      if (M.teams) {
        const A = finalTot[0] + finalTot[1], B = finalTot[2] + finalTot[3];
        const aWins = A === B ? fl[fl.length - 1] < 0.5 : crazy ? A < B : A > B;
        winners = aWins ? [0, 1] : [2, 3];
      } else {
        const target = crazy ? Math.min(...finalTot) : Math.max(...finalTot);
        const tied = finalTot.map((v, i) => (v === target ? i : -1)).filter((i) => i >= 0);
        winners = [tied[Math.floor(fl[fl.length - 1] * tied.length)]];
      }
      return { allRes, winners };
    };
    let first = true;
    const { allRes, winners } = lucky(() => simulate(first ? ((first = false), fair.bet(N)) : Array.from({ length: N }, Math.random)), (r) => r.winners.includes(0));
    const pot = allRes.flat().sort((a, b) => b.price - a.price);
    let mine = [];
    if (winners.includes(0)) mine = M.teams ? pot.filter((_, i) => i % 2 === 0) : pot; // 2v2: pot split with the teammate
    const value = round2(mine.reduce((a, b) => a + b.price, 0));
    if (mine.length) addItems('skins', mine);
    track('case', rounds.length);
    settle('battles', cost, value, { noCredit: true, noBig: true });

    const spinners = cols.map((c) => { const r = $('.reel', c); r.innerHTML = ''; return makeSpinner(r, { vertical: true, cell: 72 }); });
    for (let r = 0; r < rounds.length; r++) {
      if (!alive) return;
      const c = rounds[r];
      $$('.rd', root).forEach((x, i) => { x.classList.toggle('on', i === r); x.classList.toggle('done', i < r); });
      $('[data-hc]', root).innerHTML = caseImg(c, 128);
      $('[data-ht]', root).textContent = `Manche ${r + 1}/${rounds.length} · ${c.name}`;
      const res = allRes[r];
      await Promise.all(spinners.map((s, i) => s.spin(c, res[i].k, { duration: settings.fast ? 2600 : 3800, quiet: i > 0 })));
      if (!alive) return;
      const best = Math.max(...res.map((x) => ITEMS[x.k].r));
      sfx.caseReveal(Math.min(4, best));
      if (best >= 3) haptic(true);
      res.forEach((it, i) => {
        players[i].items.push(it);
        players[i].total = round2(players[i].total + it.price);
        $('.tot', cols[i]).innerHTML = money(players[i].total);
        $('.got', cols[i]).insertAdjacentHTML('afterbegin', `<div class="mini" style="--rc:${RAR[ITEMS[it.k].r].color}">${skinImg(it.k, 128)}</div>`);
      });
      await sleep(700);
    }
    const score = (arr) => arr.reduce((a, p) => a + p.total, 0);
    cols.forEach((c, i) => c.classList.add(winners.includes(i) ? 'win' : 'lose'));
    $$('.rd', root).forEach((x) => x.classList.add('done'));
    $('[data-ht]', root).textContent = winners.includes(0) ? 'VICTOIRE !' : `${players[winners[0]].name} gagne`;
    const end = $('[data-end]', root);
    if (winners.includes(0)) {
      ach('battle', true);
      sfx.bigWin(); confetti({ n: 200 });
      end.innerHTML = `<div class="panel" style="text-align:center;border:2px solid var(--green)"><div style="display:grid;place-items:center;color:#ffc800">${icon('trophy', 34)}</div><b style="font-size:18px">Tu remportes ${money(value)}</b><div class="dim" style="font-size:12px;margin:4px 0 10px">${mine.length} skins ajoutés à ton inventaire${M.teams ? ' (pot partagé avec ton coéquipier)' : ''}</div><div class="grid2">${mine.slice(0, 6).map((it) => skinCard(it)).join('')}</div></div>`;
    } else {
      sfx.lose();
      end.innerHTML = `<div class="panel" style="text-align:center"><div style="display:grid;place-items:center;color:var(--txt3)">${icon('skull', 34)}</div><b>Perdu cette fois…</b><div class="dim" style="font-size:12px">Le gagnant repart avec ${money(score(players))} de skins.</div></div>`;
    }
    end.insertAdjacentHTML('beforeend', `<div class="row" style="margin-top:10px"><button class="btn grow" data-new>Nouvelle battle</button><button class="btn green grow" data-again>Rejouer · ${money(cost)}</button></div>`);
    $('[data-new]', end).onclick = () => { sfx.click(); setup(); };
    $('[data-again]', end).onclick = () => { sfx.click(); run(rounds); };
  }

  setup();
  return () => { alive = false; };
}
