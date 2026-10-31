import { placeBet, settle, fair } from '../store.js';
import { $, el, css, gameLayout, betField, historyBar, modeTabs, autoField, money, sleep, clamp, animateNumber } from '../ui.js';
import { crashPoint } from '../rng.js';
import { sfx } from '../audio.js';

css('limbo', `
.limbo-stage { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; position: relative; overflow: hidden; }
.limbo-stage .stars { position: absolute; inset: 0; background-image: radial-gradient(1.5px 1.5px at 20% 30%, #fff8, transparent), radial-gradient(1px 1px at 70% 20%, #fff6, transparent), radial-gradient(1.5px 1.5px at 40% 70%, #fff5, transparent), radial-gradient(1px 1px at 85% 60%, #fff7, transparent), radial-gradient(1px 1px at 10% 85%, #fff5, transparent), radial-gradient(2px 2px at 55% 45%, #fff4, transparent); background-size: 200px 200px; animation: starMove 6s linear infinite; opacity: .6; }
.limbo-stage.go .stars { animation-duration: .5s; }
@keyframes starMove { to { background-position: 0 200px; } }
.limbo-num { font-size: 68px; font-weight: 900; letter-spacing: -2px; position: relative; font-variant-numeric: tabular-nums; }
.limbo-num.win { color: var(--green); text-shadow: 0 0 40px rgba(0,231,1,.5); }
.limbo-num.lose { color: var(--red); }
.limbo-rocket { position: absolute; bottom: 18px; font-size: 34px; transition: transform .5s cubic-bezier(.3,1.4,.5,1); }
`);

export function mount(root) {
  const { stage, controls } = gameLayout(root, { id: 'limbo' });
  const hist = historyBar(stage);
  const box = el(`<div class="limbo-stage"><div class="stars"></div><div class="limbo-num">1.00×</div></div>`);
  stage.append(box);
  const num = $('.limbo-num', box);
  let target = 2, running = false, auto = false, stop = false;

  const tabs = modeTabs((m) => { auto = m === 'auto'; autoF.el.classList.toggle('hidden', !auto); btn.textContent = auto ? 'Lancer l’auto' : 'Parier'; });
  const bet = betField('limbo');
  const opts = el(`<div class="ctl-row">
    <div><div class="label">Multiplicateur cible</div><div class="field"><div class="in"><input data-t inputmode="decimal" value="2.00"></div><span class="fbtn" style="display:grid;place-items:center;min-width:28px">×</span></div></div>
    <div><div class="label">Chance de gain</div><div class="field ro"><div class="in" data-c>49.50 %</div></div></div></div>`);
  const profit = el(`<div><div class="label">Profit si gain</div><div class="field ro"><div class="in" data-p></div></div></div>`);
  const autoF = autoField(); autoF.el.classList.add('hidden');
  const btn = el('<button class="btn green full lg">Parier</button>');
  controls.append(tabs.el, bet.el, opts, profit, autoF.el, btn);
  const tIn = $('[data-t]', opts);
  const upd = () => {
    $('[data-c]', opts).textContent = (99 / target).toFixed(4).replace(/0+$/, '').replace(/\.$/, '') + ' %';
    $('[data-p]', profit).innerHTML = money(bet.value * (target - 1));
  };
  tIn.onchange = () => { target = clamp(parseFloat(tIn.value.replace(',', '.')) || 2, 1.01, 1e6); tIn.value = target.toFixed(2); upd(); };
  bet.onChange = upd; upd();

  async function play() {
    const amount = bet.value;
    if (!placeBet('limbo', amount)) return false;
    sfx.bet();
    const res = crashPoint(fair.bet(1)[0]);
    const win = res >= target;
    num.className = 'limbo-num';
    box.classList.add('go');
    sfx.whoosh(0.3);
    const dur = auto ? 260 : 520;
    let lastT = 0;
    await animateNumber(1, res, dur, (v) => {
      num.textContent = v.toFixed(2) + '×';
      const now = performance.now();
      if (now - lastT > 50) { sfx.tick(1 + Math.min(1, Math.log10(v)), 0.05); lastT = now; }
    });
    box.classList.remove('go');
    num.textContent = res.toFixed(2) + '×';
    num.classList.add(win ? 'win' : 'lose');
    settle('limbo', amount, win ? amount * target : 0, { mult: win ? target : 0 });
    hist.push(res, win);
    win ? sfx.win(target) : sfx.lose();
    return true;
  }

  btn.onclick = async () => {
    if (running) { stop = true; return; }
    running = true; stop = false; bet.disable(true); tabs.disable(true);
    if (!auto) { btn.disabled = true; await play(); btn.disabled = false; }
    else {
      btn.textContent = 'Arrêter l’auto';
      let n = autoF.value || Infinity;
      while (n-- > 0 && !stop && root.isConnected) { if (!(await play())) break; await sleep(250); }
      btn.textContent = 'Lancer l’auto';
    }
    running = false; bet.disable(false); tabs.disable(false);
  };
  return () => { stop = true; };
}
