/* ══════════════════════════════════════════
   TÀI KHOẢN → "Túi của tôi" (#account-bag).
   Chỉ XEM LẠI số dư + vật phẩm đã sở hữu — mua thêm là việc của Cửa hàng, không
   lặp lại luồng mua ở đây. Màn hình chia 2 lớp:
   1) Danh sách HẠNG MỤC (danh mục nào cũng có sẵn dữ liệu thật trong dự án, không
      bịa số liệu): Skill, Nền bàn, Mẫu gạch, Bong bóng chat, Map ẩn.
   2) Bấm vào 1 hạng mục → hiện lưới/list các món đã sở hữu trong đúng hạng mục đó,
      có nút "‹ Hạng mục" để quay lại bước 1 (khác với nút Back ngoài cùng của
      account-hub, cái đó đóng luôn cả màn Túi).
   Nguồn dữ liệu từng hạng mục (dùng nguyên, không tạo field trùng lặp):
   - Số dư: syncWalletFromServer() (js/online-services.js) rồi đọc qua
     getGold()/getDiamonds() (js/inventory.js) và Inventory.hearts.
   - Skill: VS_OBSTACLES + isVsCardUnlocked (js/versus.js) — bộ thẻ chướng ngại
     rút được khi chơi Đấu 1-1 (Versus) rồi ném sang bàn đối thủ, KHÔNG phải
     fires/bubbles/winds của chế độ 1 người chơi (nhầm lẫn ở bản trước, đã sửa).
     3 thẻ mặc định miễn phí, số còn lại mua mở khoá ở Shop (tab "Thẻ đấu").
   - Nền bàn / Mẫu gạch: BOARD_SKINS/BRICK_SKINS + isXSkinUnlocked/getActiveXSkin/
     applyXSkin (js/map-boards.js, js/brick-skins.js) — như bản cũ.
   - Bong bóng chat: CHAT_BUBBLE_SKINS + isBubbleSkinUnlocked (js/chat-bubble-skins.js),
     bong bóng "classic" luôn mở sẵn (không có trong mảng, tự thêm ở đầu danh sách).
     "Đang dùng"/"Dùng" đọc/ghi qua getPlayerProfile().bubbleStyle (savePlayerProfile)
     — đúng field CaroSocial.currentBubbleStyle() đang dùng, không tạo field mới.
   - Map ẩn: HIDDEN_MAP_LIST (js/main.js) + clearedHiddenMaps (Set, js/main.js) —
     bấm vào ô map đã qua sẽ chơi lại đúng map đó qua hàm run() có sẵn trong từng
     phần tử danh sách; map chưa qua chỉ hiện khoá, không bấm được.
   LƯU Ý: "Rương", "Mẫu chữ", "Mẫu tên hiển thị" KHÔNG có trong yêu cầu hạng mục ở
   đây vì dự án hiện chưa có hệ thống nào lưu vật phẩm dạng đó (đã rà toàn bộ code,
   không thấy field/list liên quan) — thêm 3 danh mục này cần xây tính năng mới từ
   đầu (định nghĩa vật phẩm, nơi mở khoá/mua...), không phải việc sắp xếp lại màn
   hình sẵn có nên chưa đưa vào đây.
══════════════════════════════════════════ */

const ACBAG_BRICK_PREVIEW_COLORS = ["#E24B4A", "#378ADD", "#1D9E75", "#EF9F27"];
const ACBAG_CATEGORIES = ['skills', 'boards', 'bricks', 'bubbles', 'maps', 'chests', 'fonts', 'nametags'];
const ACBAG_CAT_ICON = { skills:'⚔️', boards:'🖼️', bricks:'🧱', bubbles:'💬', maps:'🗺️', chests:'📦', fonts:'🔤', nametags:'🏷️' };
const ACBAG_CAT_KEY  = { skills:'acbagCatSkills', boards:'acbagCatBoards', bricks:'acbagCatBricks', bubbles:'acbagCatBubbles', maps:'acbagCatMaps', chests:'acbagCatChests', fonts:'acbagCatFonts', nametags:'acbagCatNameTags' };
// 3 hạng mục dưới đây CHƯA có hệ thống dữ liệu thật trong dự án (không có field/
// list nào lưu rương/mẫu chữ/mẫu tên hiển thị đã sở hữu) — đang được xây ở luồng
// khác. Thêm trước lối vào + trạng thái "sắp ra mắt" (đúng mẫu account-groups.js
// đã dùng cho Hội nhóm) để có chỗ đứng sẵn trong danh sách hạng mục; PHẦN DỮ LIỆU
// THẬT sẽ do luồng đang xây kia đổ vào _acbagRenderDetail() sau, không tự bịa số
// liệu/danh sách vật phẩm ở đây.
const ACBAG_CAT_SOON = { chests:true, fonts:true, nametags:true };
let _acbagView = 'categories'; // 'categories' | 'skills' | 'boards' | 'bricks' | 'bubbles' | 'maps'

function _acbagT(k, ...args){ return (typeof t === 'function') ? t(k, ...args) : k; }
function _acbagEsc(s){ return (typeof escapeHtml === 'function') ? escapeHtml(s) : String(s||''); }

/* ── Đếm số lượng sở hữu / tổng số của từng hạng mục — dùng cho badge số ở danh sách hạng mục ── */
function _acbagCatCount(cat){
  if(ACBAG_CAT_SOON[cat]) return { owned:null, total:null, soon:true };
  if(cat === 'skills'){
    const list = (typeof VS_OBSTACLES !== 'undefined') ? VS_OBSTACLES : [];
    const owned = list.filter(function(ob){ return typeof isVsCardUnlocked==='function' && isVsCardUnlocked(ob.id); }).length;
    return { owned, total:list.length };
  }
  if(cat === 'boards'){
    const list = (typeof BOARD_SKINS !== 'undefined') ? BOARD_SKINS : [];
    return { owned:list.filter(s=>s && isBoardSkinUnlocked(s.id)).length, total:list.length };
  }
  if(cat === 'bricks'){
    const list = (typeof BRICK_SKINS !== 'undefined') ? BRICK_SKINS : [];
    return { owned:list.filter(s=>s && isBrickSkinUnlocked(s.id)).length, total:list.length };
  }
  if(cat === 'bubbles'){
    const list = (typeof CHAT_BUBBLE_SKINS !== 'undefined') ? CHAT_BUBBLE_SKINS : [];
    const owned = 1 + list.filter(s=>s && typeof isBubbleSkinUnlocked==='function' && isBubbleSkinUnlocked(s.id)).length; // +1 vì "classic" luôn có sẵn
    return { owned, total: list.length + 1 };
  }
  if(cat === 'maps'){
    const list = (typeof HIDDEN_MAP_LIST !== 'undefined') ? HIDDEN_MAP_LIST : [];
    const cleared = (typeof clearedHiddenMaps !== 'undefined' && clearedHiddenMaps) ? clearedHiddenMaps.size : 0;
    return { owned:cleared, total:list.length };
  }
  return { owned:0, total:null };
}

/* ── Bước 1: danh sách hạng mục ── */
function _acbagRenderCategories(){
  const wrap = document.getElementById('acbag-categories');
  if(!wrap) return;
  wrap.innerHTML = ACBAG_CATEGORIES.map(cat=>{
    const c = _acbagCatCount(cat);
    const countTxt = c.soon ? _acbagT('acbagSoonBadge') : (c.total===null ? String(c.owned) : (c.owned+'/'+c.total));
    return '<button type="button" class="acbag-cat-row' + (c.soon ? ' soon' : '') + '" data-cat="'+cat+'">'
      + '<span class="acbag-cat-ico">'+ACBAG_CAT_ICON[cat]+'</span>'
      + '<span class="acbag-cat-label">'+_acbagEsc(_acbagT(ACBAG_CAT_KEY[cat]))+'</span>'
      + '<span class="acbag-cat-count' + (c.soon ? ' soon' : '') + '">'+_acbagEsc(countTxt)+'</span>'
      + '<span class="acbag-cat-arrow">›</span>'
      + '</button>';
  }).join('');
  wrap.querySelectorAll('[data-cat]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      try{ sfxClick(); }catch(e){}
      _acbagSetView(btn.getAttribute('data-cat'));
    });
  });
}

/* ── Thẻ dùng chung cho Nền bàn / Mẫu gạch / Bong bóng chat (đều có khoá + nút Dùng) ── */
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
function _acbagBubblePreviewEl(skinId){
  const b = document.createElement('div');
  b.className = 'acbag-bubble-preview style-' + (skinId || 'classic');
  b.textContent = 'Aa';
  return b;
}

function _acbagSkinCardEl(item, kind){
  // kind: 'board' | 'brick' | 'bubble'
  const unlocked = kind==='board' ? isBoardSkinUnlocked(item.id)
                  : kind==='brick' ? isBrickSkinUnlocked(item.id)
                  : (item.id==='classic' ? true : (typeof isBubbleSkinUnlocked==='function' && isBubbleSkinUnlocked(item.id)));
  const active = kind==='board' ? (getActiveBoardSkin() === item.id)
                : kind==='brick' ? (getActiveBrickSkin() === item.id)
                : (typeof CaroSocial!=='undefined' && CaroSocial.currentBubbleStyle ? CaroSocial.currentBubbleStyle()===item.id : false);

  const card = document.createElement('div');
  card.className = 'acbag-card' + (unlocked ? '' : ' locked') + (active ? ' active' : '');

  const previewWrap = document.createElement('div');
  previewWrap.className = 'acbag-card-preview';
  previewWrap.appendChild(
    kind==='board' ? _acbagBoardPreviewEl(item.id) :
    kind==='brick' ? _acbagBrickPreviewEl(item.id) :
    _acbagBubblePreviewEl(item.id)
  );
  if(!unlocked){
    const lock = document.createElement('div');
    lock.className = 'acbag-lock';
    lock.textContent = '🔒';
    previewWrap.appendChild(lock);
  }
  card.appendChild(previewWrap);

  const name = document.createElement('div');
  name.className = 'acbag-card-name';
  name.textContent = item.name || item.id;
  card.appendChild(name);

  if(unlocked){
    if(active){
      const check = document.createElement('div');
      check.className = 'acbag-check';
      check.textContent = '✓ ' + _acbagT('acbagInUse');
      card.appendChild(check);
    }else{
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'acbag-use-btn';
      btn.textContent = _acbagT('acbagUse');
      btn.addEventListener('click', ()=>{
        try{ sfxClick(); }catch(e){}
        if(kind==='board') applyBoardSkin(item.id);
        else if(kind==='brick') applyBrickSkin(item.id);
        else if(typeof savePlayerProfile==='function') savePlayerProfile({ bubbleStyle:item.id });
        _acbagRenderDetail();
      });
      card.appendChild(btn);
    }
  }
  return card;
}

/* ── Skill: đúng nghĩa là bộ thẻ chướng ngại dùng khi chơi Versus (Đấu 1-1) —
   rút được trong trận rồi ném sang bàn đối thủ. 3 thẻ mặc định miễn phí (xem
   VS_OBSTACLES.free trong js/versus.js), số còn lại phải mua mở khoá ở Shop
   (tab "Thẻ đấu") mới xuất hiện trong bộ bài rút của mình. KHÔNG liên quan tới
   fires/bubbles/winds (đó là vật phẩm dùng trong chế độ 1 người chơi, đã bỏ
   nhầm ở đây trước đó). ── */
function _acbagRenderSkills(grid){
  grid.className = 'acbag-grid';
  grid.innerHTML = '';
  const list = (typeof VS_OBSTACLES !== 'undefined') ? VS_OBSTACLES : [];
  list.forEach(function(ob){
    const unlocked = typeof isVsCardUnlocked==='function' && isVsCardUnlocked(ob.id);
    const card = document.createElement('div');
    card.className = 'acbag-card' + (unlocked ? '' : ' locked');

    const previewWrap = document.createElement('div');
    previewWrap.className = 'acbag-card-preview';
    const emo = document.createElement('div');
    emo.className = 'acbag-map-emo';
    emo.textContent = ob.emoji;
    previewWrap.appendChild(emo);
    if(!unlocked){
      const lock = document.createElement('div');
      lock.className = 'acbag-lock';
      lock.textContent = '🔒';
      previewWrap.appendChild(lock);
    }
    card.appendChild(previewWrap);

    const name = document.createElement('div');
    name.className = 'acbag-card-name';
    name.textContent = (typeof MECH_NAME==='function' ? MECH_NAME(ob.nameIdx) : ob.id).replace(/^\S+\s/, '');
    card.appendChild(name);

    if(ob.free){
      const check = document.createElement('div');
      check.className = 'acbag-check';
      check.textContent = _acbagT('acbagVsCardFree');
      card.appendChild(check);
    }else if(unlocked){
      const check = document.createElement('div');
      check.className = 'acbag-check';
      check.textContent = '✓ ' + _acbagT('acbagInUse');
      card.appendChild(check);
    }else{
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'acbag-use-btn';
      btn.textContent = _acbagT('acbagVsCardBuy');
      btn.addEventListener('click', ()=>{
        try{ sfxClick(); }catch(e){}
        if(typeof openShop==='function') openShop('vscards');
      });
      card.appendChild(btn);
    }
    grid.appendChild(card);
  });
}

/* Kiểm tra map đã qua chưa — bản port y hệt isHiddenMapCleared (js/brick-skins.js,
   hàm nội bộ không export ra ngoài) để xử lý đúng alias 2 chiều 'secret'/'secret1'. */
function _acbagIsMapCleared(key){
  if(typeof clearedHiddenMaps === 'undefined' || !clearedHiddenMaps) return false;
  if(clearedHiddenMaps.has(key)) return true;
  try{
    if(typeof CLEARED_MAPS_ALIAS !== 'undefined' && CLEARED_MAPS_ALIAS){
      if(CLEARED_MAPS_ALIAS[key] && clearedHiddenMaps.has(CLEARED_MAPS_ALIAS[key])) return true;
      for(const k in CLEARED_MAPS_ALIAS){
        if(CLEARED_MAPS_ALIAS[k] === key && clearedHiddenMaps.has(k)) return true;
      }
    }
  }catch(e){}
  return false;
}

/* ── Map ẩn: lưới 22 map, đã qua thì bấm chơi lại, chưa qua thì khoá ── */
function _acbagRenderMaps(grid){
  grid.className = 'acbag-grid';
  const list = (typeof HIDDEN_MAP_LIST !== 'undefined') ? HIDDEN_MAP_LIST : [];
  grid.innerHTML = '';
  list.forEach(m=>{
    if(!m) return;
    const done = _acbagIsMapCleared(m.key);
    const card = document.createElement('div');
    card.className = 'acbag-card' + (done ? '' : ' locked');
    const previewWrap = document.createElement('div');
    previewWrap.className = 'acbag-card-preview';
    const emo = document.createElement('div');
    emo.className = 'acbag-map-emo';
    emo.textContent = done ? '🗺️' : '❔';
    previewWrap.appendChild(emo);
    if(!done){
      const lock = document.createElement('div');
      lock.className = 'acbag-lock';
      lock.textContent = '🔒';
      previewWrap.appendChild(lock);
    }
    card.appendChild(previewWrap);
    const name = document.createElement('div');
    name.className = 'acbag-card-name';
    name.textContent = m.label || m.key;
    card.appendChild(name);
    if(done){
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'acbag-use-btn';
      btn.textContent = _acbagT('acbagReplay');
      btn.addEventListener('click', ()=>{
        try{ sfxClick(); }catch(e){}
        // Đóng hết panel Tài khoản (Túi → Hub) trước khi vào lại map, đúng cặp
        // hàm _acchubCloseSub/closeAccountHub account-hub.js đang dùng cho mọi
        // panel con khác — không tự chế cách đóng khác.
        try{ if(typeof _acchubCloseSub==='function') _acchubCloseSub('account-bag-panel'); }catch(e){}
        try{ if(typeof closeAccountHub==='function') closeAccountHub(); }catch(e){}
        if(typeof m.run === 'function') m.run();
      });
      card.appendChild(btn);
    }
    grid.appendChild(card);
  });
}

/* ── Bước 2: chi tiết 1 hạng mục ── */
/* ── Rương / Mẫu chữ / Mẫu tên hiển thị: chưa có hệ thống dữ liệu thật, hiện
   trạng thái "sắp ra mắt" đúng mẫu account-groups.js (Hội nhóm) đang dùng —
   không tự bịa vật phẩm/số lượng khi chưa có quyết định thiết kế dữ liệu. ── */
function _acbagRenderSoon(grid, cat){
  grid.className = 'acbag-soon-wrap';
  grid.innerHTML =
    '<div class="acbag-empty">'
    + '<div class="acbag-empty-icon">'+ACBAG_CAT_ICON[cat]+'</div>'
    + '<div class="acbag-empty-title">'+_acbagEsc(_acbagT('acbagSoonTitle'))+'</div>'
    + '<div class="acbag-empty-sub">'+_acbagEsc(_acbagT('acbagSoonSub'))+'</div>'
    + '</div>';
}

function _acbagRenderDetail(){
  const titleEl = document.getElementById('acbag-detail-title');
  const grid = document.getElementById('acbag-grid');
  if(!titleEl || !grid) return;
  titleEl.textContent = _acbagT(ACBAG_CAT_KEY[_acbagView] || '');

  if(ACBAG_CAT_SOON[_acbagView]){ _acbagRenderSoon(grid, _acbagView); return; }
  if(_acbagView === 'skills'){ _acbagRenderSkills(grid); return; }
  if(_acbagView === 'maps'){ _acbagRenderMaps(grid); return; }

  grid.className = 'acbag-grid';
  grid.innerHTML = '';
  if(_acbagView === 'boards'){
    const list = (typeof BOARD_SKINS !== 'undefined') ? BOARD_SKINS : [];
    list.forEach(s=>{ if(s) grid.appendChild(_acbagSkinCardEl(s, 'board')); });
  }else if(_acbagView === 'bricks'){
    const list = (typeof BRICK_SKINS !== 'undefined') ? BRICK_SKINS : [];
    list.forEach(s=>{ if(s) grid.appendChild(_acbagSkinCardEl(s, 'brick')); });
  }else if(_acbagView === 'bubbles'){
    const list = [{ id:'classic', name:_acbagT('acbagBubbleClassic') }]
      .concat((typeof CHAT_BUBBLE_SKINS !== 'undefined') ? CHAT_BUBBLE_SKINS : []);
    list.forEach(s=>{ if(s) grid.appendChild(_acbagSkinCardEl(s, 'bubble')); });
  }
}

function _acbagSetView(view){
  if(view !== 'categories' && ACBAG_CATEGORIES.indexOf(view) < 0) return;
  _acbagView = view;
  const catsEl = document.getElementById('acbag-categories');
  const detailEl = document.getElementById('acbag-detail');
  if(view === 'categories'){
    if(catsEl) catsEl.style.display = '';
    if(detailEl) detailEl.style.display = 'none';
    _acbagRenderCategories();
  }else{
    if(catsEl) catsEl.style.display = 'none';
    if(detailEl) detailEl.style.display = '';
    _acbagRenderDetail();
  }
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

  if(!container.dataset.built){
    let html = '';
    html += '<div class="acbag-wallet">';
    html +=   '<div class="acbag-wallet-box"><span class="acbag-wallet-icon">🪙</span><span class="acbag-wallet-num" id="acbag-gold">0</span></div>';
    html +=   '<div class="acbag-wallet-box"><span class="acbag-wallet-icon">💎</span><span class="acbag-wallet-num" id="acbag-diamonds">0</span></div>';
    html +=   '<div class="acbag-wallet-box"><span class="acbag-wallet-icon">❤️</span><span class="acbag-wallet-num" id="acbag-hearts">0</span></div>';
    html += '</div>';
    html += '<div class="acbag-cat-list" id="acbag-categories"></div>';
    html += '<div class="acbag-detail" id="acbag-detail" style="display:none">';
    html +=   '<button type="button" class="acbag-detail-back" id="acbag-detail-back">‹ <span data-i18n="acbagBackToCats">'+_acbagEsc(_acbagT('acbagBackToCats'))+'</span></button>';
    html +=   '<div class="acbag-detail-title" id="acbag-detail-title"></div>';
    html +=   '<div class="acbag-grid" id="acbag-grid"></div>';
    html += '</div>';
    container.innerHTML = html;
    container.dataset.built = '1';

    document.getElementById('acbag-detail-back')?.addEventListener('click', ()=>{
      try{ sfxClick(); }catch(e){}
      _acbagSetView('categories');
    });
  }

  _acbagView = 'categories';
  _acbagSetView('categories');
  _acbagRenderWallet();

  if(typeof syncWalletFromServer === 'function'){
    syncWalletFromServer().then(()=>{
      const stillOpen = document.getElementById('account-bag-panel')?.classList.contains('show');
      if(stillOpen){ _acbagRenderWallet(); if(_acbagView==='categories') _acbagRenderCategories(); }
    }).catch(()=>{});
  }
}

(function initAccountBag(){
  function bind(){
    document.getElementById('acchub-row-bag')?.addEventListener('click', renderAccountBag);
    document.getElementById('header-bag-btn')?.addEventListener('click', ()=>{
      try{ sfxClick(); }catch(e){}
      renderAccountBag();
      document.getElementById('account-bag-panel')?.classList.add('show');
    });
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
  else bind();
})();
