/* ══════════════════════════════════════════
   TÀI KHOẢN → "Túi của tôi" (#account-bag).
   Chỉ XEM LẠI số dư + skin đã sở hữu — mua thêm là việc của Cửa hàng, không lặp
   lại luồng mua ở đây:
   - Số dư: syncWalletFromServer() (js/online-services.js) rồi đọc qua
     getGold()/getDiamonds() (js/inventory.js) và Inventory.hearts (getter áp dụng
     hồi tim tự động — dự án không có hàm getHearts() riêng, đây là API công khai
     tương đương đã có sẵn).
   - Danh sách skin: BOARD_SKINS/isBoardSkinUnlocked/getActiveBoardSkin/
     applyBoardSkin (js/map-boards.js) và BRICK_SKINS/isBrickSkinUnlocked/
     getActiveBrickSkin/applyBrickSkin (js/brick-skins.js) — dùng nguyên hàm chọn
     skin đã có, không viết logic chọn mới.
══════════════════════════════════════════ */

const ACBAG_BRICK_PREVIEW_COLORS = ["#E24B4A", "#378ADD", "#1D9E75", "#EF9F27"];
let _acbagTab = 'boards';

function _acbagBoardPreviewEl(skinId){
  const sw = document.createElement('div');
  sw.className = 'board-swatch acbag-preview-swatch';
  sw.setAttribute('data-board-skin', skinId || 'classic');
  return sw;
}

function _acbagBrickPreviewEl(skinId){
  const wrap = document.createElement('div');
  wrap.className = 'acbag-brick-preview';
  ACBAG_BRICK_PREVIEW_COLORS.forEach(function(c){
    const d = document.createElement('div');
    d.className = 'brick-swatch acbag-preview-swatch';
    d.setAttribute('data-brick-skin', skinId || 'classic');
    d.style.setProperty('--cc', c);
    wrap.appendChild(d);
  });
  return wrap;
}

function _acbagCardEl(skin, kind){
  const tt = (k, ...args) => (typeof t === 'function' ? t(k, ...args) : k);
  const esc = (s) => (typeof escapeHtml === 'function' ? escapeHtml(s) : String(s||''));
  const isBoard = kind === 'board';
  const unlocked = isBoard ? isBoardSkinUnlocked(skin.id) : isBrickSkinUnlocked(skin.id);
  const active = isBoard ? (getActiveBoardSkin() === skin.id) : (getActiveBrickSkin() === skin.id);

  const card = document.createElement('div');
  card.className = 'acbag-card' + (unlocked ? '' : ' locked') + (active ? ' active' : '');

  const previewWrap = document.createElement('div');
  previewWrap.className = 'acbag-card-preview';
  previewWrap.appendChild(isBoard ? _acbagBoardPreviewEl(skin.id) : _acbagBrickPreviewEl(skin.id));
  if(!unlocked){
    const lock = document.createElement('div');
    lock.className = 'acbag-lock';
    lock.textContent = '🔒';
    previewWrap.appendChild(lock);
  }
  card.appendChild(previewWrap);

  const name = document.createElement('div');
  name.className = 'acbag-card-name';
  name.textContent = skin.name || skin.id;
  card.appendChild(name);

  if(unlocked){
    if(active){
      const check = document.createElement('div');
      check.className = 'acbag-check';
      check.textContent = '✓ ' + tt('acbagInUse');
      card.appendChild(check);
    }else{
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'acbag-use-btn';
      btn.textContent = tt('acbagUse');
      btn.addEventListener('click', ()=>{
        try{ sfxClick(); }catch(e){}
        if(isBoard) applyBoardSkin(skin.id); else applyBrickSkin(skin.id);
        renderAccountBag();
      });
      card.appendChild(btn);
    }
  }

  return card;
}

function _acbagRenderGrid(){
  const grid = document.getElementById('acbag-grid');
  if(!grid) return;
  grid.innerHTML = '';
  const isBoard = _acbagTab === 'boards';
  const list = isBoard ? (typeof BOARD_SKINS !== 'undefined' ? BOARD_SKINS : []) : (typeof BRICK_SKINS !== 'undefined' ? BRICK_SKINS : []);
  list.forEach(skin=>{
    if(!skin) return;
    grid.appendChild(_acbagCardEl(skin, isBoard ? 'board' : 'brick'));
  });
}

function _acbagSetTab(tabName){
  if(tabName !== 'boards' && tabName !== 'bricks') return;
  _acbagTab = tabName;
  document.getElementById('acbag-tab-boards')?.classList.toggle('active', tabName === 'boards');
  document.getElementById('acbag-tab-bricks')?.classList.toggle('active', tabName === 'bricks');
  _acbagRenderGrid();
}

function _acbagRenderWallet(){
  const goldEl = document.getElementById('acbag-gold');
  const diaEl = document.getElementById('acbag-diamonds');
  const heartEl = document.getElementById('acbag-hearts');
  if(goldEl) goldEl.textContent = (typeof getGold === 'function') ? getGold() : 0;
  if(diaEl) diaEl.textContent = (typeof getDiamonds === 'function') ? getDiamonds() : 0;
  if(heartEl){
    const h = (typeof Inventory !== 'undefined' && Inventory) ? Inventory.hearts : 0;
    heartEl.textContent = (typeof formatHearts === 'function') ? formatHearts(h) : h;
  }
}

function renderAccountBag(){
  const container = document.getElementById('account-bag');
  if(!container) return;

  const tt = (k, ...args) => (typeof t === 'function' ? t(k, ...args) : k);
  const esc = (s) => (typeof escapeHtml === 'function' ? escapeHtml(s) : String(s||''));

  if(!container.dataset.built){
    let html = '';
    html += '<div class="acbag-wallet">';
    html +=   '<div class="acbag-wallet-box"><span class="acbag-wallet-icon">🪙</span><span class="acbag-wallet-num" id="acbag-gold">0</span></div>';
    html +=   '<div class="acbag-wallet-box"><span class="acbag-wallet-icon">💎</span><span class="acbag-wallet-num" id="acbag-diamonds">0</span></div>';
    html +=   '<div class="acbag-wallet-box"><span class="acbag-wallet-icon">❤️</span><span class="acbag-wallet-num" id="acbag-hearts">0</span></div>';
    html += '</div>';
    html += '<div class="acbag-tabs">';
    html +=   '<button type="button" class="acbag-tab active" id="acbag-tab-boards">'+esc(tt('acbagTabBoards'))+'</button>';
    html +=   '<button type="button" class="acbag-tab" id="acbag-tab-bricks">'+esc(tt('acbagTabBricks'))+'</button>';
    html += '</div>';
    html += '<div class="acbag-grid" id="acbag-grid"></div>';
    container.innerHTML = html;
    container.dataset.built = '1';

    document.getElementById('acbag-tab-boards')?.addEventListener('click', ()=>{
      try{ sfxClick(); }catch(e){}
      _acbagSetTab('boards');
    });
    document.getElementById('acbag-tab-bricks')?.addEventListener('click', ()=>{
      try{ sfxClick(); }catch(e){}
      _acbagSetTab('bricks');
    });
  }

  _acbagRenderWallet();
  _acbagRenderGrid();

  if(typeof syncWalletFromServer === 'function'){
    syncWalletFromServer().then(()=>{
      const stillOpen = document.getElementById('account-bag-panel')?.classList.contains('show');
      if(stillOpen) _acbagRenderWallet();
    }).catch(()=>{});
  }
}

(function initAccountBag(){
  function bind(){
    document.getElementById('acchub-row-bag')?.addEventListener('click', renderAccountBag);
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
  else bind();
})();
