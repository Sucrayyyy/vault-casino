import { placeBet, settle, fair, S, lucky } from '../store.js';
import { $, el, css, gameLayout, betField, historyBar, modeTabs, autoField, fmt, fmtX, money, sleep, clamp } from '../ui.js';
import { sfx } from '../audio.js';

css('dice', `
.dice-wrap { flex: 1; display: flex; flex-direction: column; justify-content: center; padding: 20px 18px 26px; gap: 34px; }
.dice-track { position: relative; height: 68px; background: var(--bg4); border-radius: 99px; padding: 0 22px; display: flex; align-items: center; box-shadow: inset 0 2px 6px rgba(0,0,0,.3); }
.dice-scale { position: absolute; left: 22px; right: 22px; top: -26px; display: flex; justify-content: space-between; color: var(--txt2); font-size: 12px; }
.dice-scale span { width: 0; display: flex; justify-content: center; }
.dice-bar { position: relative; flex: 1; height: 10px; border-radius: 99px; }
.dice-bar input { position: absolute; inset: -20px 0; width: 100%; opacity: 0; z-index: 3; height: 50px; }
.dice-thumb { position: absolute; top: 50%; width: 36px; height: 36px; margin: -18px 0 0 -18px; border-radius: 6px; background: var(--blue); box-shadow: 0 4px 10px rgba(0,0,0,.4); display: grid; place-items: center; z-index: 2; pointer-events: none; }
.dice-thumb::before { content: ''; width: 14px; height: 14px; background: repeating-linear-gradient(90deg, rgba(255,255,255,.7) 0 2px, transparent 2px 5px); }
.dice-res { position: absolute; bottom: 30px; transform: translateX(-50%); transition: left .45s cubic-bezier(.2,.9,.3,1.1); z-index: 4; pointer-events: none; opacity: 0; }
.dice-res.show { opacity: 1; }
.dice-res .hex { width: 58px; height: 52px; display: grid; place-items: center; font-weight: 900; font-size: 15px; color: #fff; position: relative; }
.dice-res .hex svg { position: absolute; inset: 0; }
.dice-res .hex span { position: relative; }
`);

export function mount(root) {
  const { stage, controls } = gameLayout(root, { id: 'dice' });
  const hist = historyBar(stage);
  let target = 50.5, over = true, running = false, auto = false, stopAuto = false;
  const box = el(`<div class="dice-wrap">
    <div class="dice-track">
      <div class="dice-scale"><span>0</span><span>25</span><span>50</span><span>75</span><span>100</span></div>
      <div class="dice-bar"><input type="range" min="2" max="98" step="0.01"><div class="dice-thumb"></div>
        <div class="dice-res"><div class="hex"><svg viewBox="0 0 58 52"><path d="M15 2h28l14 24-14 24H15L1 26z" fill="currentColor" stroke="rgba(0,0,0,.2)" stroke-width="2"/></svg><span>50.00</span></div></div>
      </div>
    </div>
    <div class="stat-row">
      <div><div class="label">Multiplicateur</div><div class="field"><div class="in"><input data-mult inputmode="decimal"></div><span class="fbtn" style="display:grid;place-items:center">×</span></div></div>
      <div><div class="label" data-ovl>Plus de</div><button class="field" data-flip style="width:100%"><div class="in" style="justify-content:space-between"><span data-tv></span><svg width="16" height="16" viewBox="0 0 24 24"><path d="M4 8h14l-4-4M20 16H6l4 4" stroke="currentColor" stroke-width="2.4" fill="none" stroke-linecap="round"/></svg></div></button></div>
      <div><div class="label">Chance</div><div class="field"><div class="in"><input data-chance inputmode="decimal"></div><span class="fbtn" style="display:grid;place-items:center">%</span></div></div>
    </div>
  </div>`);
  stage.append(box);
  const bar = $('.dice-bar', box), range = $('input[type=range]', box), thumb = $('.dice-thumb', box), res = $('.dice-res', box);
  const multIn = $('[data-mult]', box), chanceIn = $('[data-chance]', box);

  const chance = () => (over ? 100 - target : target);
  const mult = () => 99 / chance();
  function paint() {
    const p = target;
    const g = over ? `linear-gradient(90deg, var(--red) ${p}%, var(--green) ${p}%)` : `linear-gradient(90deg, var(--green) ${p}%, var(--red) ${p}%)`;
    bar.style.background = g;
    thumb.style.left = p + '%';
    range.value = target;
    multIn.value = mult().toFixed(2);
    chanceIn.value = chance().toFixed(2);
    $('[data-tv]', box).textContent = target.toFixed(2);
    $('[data-ovl]', box).textContent = over ? 'Plus de' : 'Moins de';
    updateProfit();
  }
  let lastTick = 0;
  range.oninput = () => {
    target = clamp(+range.value, 2, 98);
    if (Math.abs(target - lastTick) > 1.5) { sfx.tick(0.8 + target / 200, 0.05); lastTick = target; }
    paint();
  };
  $('[data-flip]', box).onclick = () => { sfx.click(); over = !over; target = 100 - target; paint(); };
  multIn.onchange = () => { const m = clamp(parseFloat(multIn.value.replace(',', '.')) || 2, 1.0102, 49.5); const c = 99 / m; target = over ? 100 - c : c; paint(); };
  chanceIn.onchange = () => { const c = clamp(parseFloat(chanceIn.value.replace(',', '.')) || 49.5, 2, 98); target = over ? 100 - c : c; paint(); };

  // controls
  const tabs = modeTabs((m) => { auto = m === 'auto'; autoF.el.classList.toggle('hidden', !auto); btn.textContent = auto ? 'Lancer l’auto' : 'Parier'; });
  const bet = betField('dice');
  const profit = el(`<div><div class="label"><span>Profit si gain</span></div><div class="field"><div class="in" data-p></div></div></div>`);
  const autoF = autoField(); autoF.el.classList.add('hidden');
  const btn = el('<button class="btn green full lg">Parier</button>');
  controls.append(tabs.el, bet.el, profit, autoF.el, btn);
  function updateProfit() { $('[data-p]', profit).innerHTML = money((bet.value || 0) * (mult() - 1)); }
  bet.onChange = updateProfit;
  paint();

  async function roll() {
    const amount = bet.value;
    if (!placeBet('dice', amount)) return false;
    sfx.bet();
    const r = lucky(() => Math.floor(fair.bet(1)[0] * 10001) / 100, (x) => (over ? x > target : x < target));
    const win = over ? r > target : r < target;
    res.classList.add('show');
    res.style.left = r + '%';
    res.style.color = win ? 'var(--green)' : 'var(--red)';
    $('.hex span', res).textContent = r.toFixed(2);
    sfx.whoosh(0.2);
    await sleep(auto ? 260 : 420);
    const m = win ? mult() : 0;
    settle('dice', amount, amount * m, { mult: m });
    hist.push(win ? m : 0, win, r.toFixed(2));
    win ? sfx.win(m) : sfx.lose();
    return true;
  }

  btn.onclick = async () => {
    if (running) { stopAuto = true; return; }
    running = true; stopAuto = false;
    bet.disable(true); tabs.disable(true);
    if (!auto) {
      btn.disabled = true;
      await roll();
      btn.disabled = false;
    } else {
      btn.textContent = 'Arrêter l’auto';
      let n = autoF.value || Infinity;
      while (n-- > 0 && !stopAuto && root.isConnected) {
        if (!(await roll())) break;
        await sleep(180);
      }
      btn.textContent = 'Lancer l’auto';
    }
    running = false;
    bet.disable(false); tabs.disable(false);
  };
  return () => { stopAuto = true; };
}
