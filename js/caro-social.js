// ═══════════════════════════════════════════════════════════════
// js/caro-social.js — Chat tương tác · kết đôi · bong bóng · avatar
// Nạp SAU caro.js (dùng _caro / sendRoomChat / showRewardedAd)
// ═══════════════════════════════════════════════════════════════

(function(){
  const COUPLE_KEY = 'chromablast_caro_couple';
  const QUEST_KEY = 'chromablast_caro_couple_quest';

  const FREE_FX = [
    { id:'egg',       emoji:'🥚', label:'Trứng' },
    { id:'tomato',    emoji:'🍅', label:'Cà chua' },
    { id:'slipper',   emoji:'🩴', label:'Dép' },
    { id:'rose',      emoji:'🌹', label:'Hoa hồng' },
    { id:'handshake', emoji:'🤝', label:'Bắt tay' },
    { id:'heart',     emoji:'❤️', label:'Tim' }
  ];
  const PREMIUM_FX = [
    { id:'fire',     emoji:'🔥', label:'Phun lửa', premium:true },
    { id:'squid',    emoji:'🦑', label:'Mực', premium:true },
    { id:'cactus',   emoji:'🌵', label:'Xương rồng', premium:true },
    { id:'flowers',  emoji:'💐', label:'Ngàn hoa', premium:true },
    { id:'megaheart',emoji:'💖', label:'Tim khổng lồ', premium:true }
  ];
  const BUBBLE_STYLES = [
    { id:'classic', label:'Cổ điển', free:true },
    { id:'neon',    label:'Neon', premium:true },
    { id:'sweet',   label:'Ngọt', premium:true },
    { id:'gold',    label:'Vàng', premium:true },
    { id:'ink',     label:'Mực', premium:true },
    { id:'frost',     label:'Băng giá',     shop:true },
    { id:'mint',      label:'Bạc hà',       shop:true },
    { id:'bubblegum', label:'Kẹo bông',     shop:true },
    { id:'sunset',    label:'Hoàng hôn',    shop:true },
    { id:'ocean',     label:'Đại dương',    shop:true },
    { id:'emerald',   label:'Ngọc lục bảo', shop:true },
    { id:'royal',     label:'Hoàng gia',    shop:true },
    { id:'holo',      label:'Cầu vồng',     shop:true },
    { id:'starlight', label:'Ánh sao',      shop:true },
    { id:'legend',    label:'Huyền thoại',  shop:true }
  ];

  const bubbleQueue = [];
  let bubbleTimer = null;
  let fxLayer = null;

  function tt(key, fb){
    try{ if(typeof t==='function'){ const v=t(key); if(v && v!==key) return v; } }catch(e){}
    return fb || key;
  }

  function watchAd(){
    return new Promise((resolve, reject)=>{
      if(typeof _ppWatchAd === 'function'){
        _ppWatchAd(()=>resolve(true), ()=>reject(new Error('ad_failed')));
        return;
      }
      if(typeof showRewardedAd === 'function'){
        showRewardedAd(()=>resolve(true), ()=>{
          try{
            if(typeof Capacitor==='undefined' || !Capacitor.isNativePlatform || !Capacitor.isNativePlatform()){
              setTimeout(()=>resolve(true), 400);
              return;
            }
          }catch(e){}
          reject(new Error('ad_failed'));
        });
      } else setTimeout(()=>resolve(true), 400);
    });
  }

  function getCouple(){
    try{
      const raw = localStorage.getItem(COUPLE_KEY);
      const j = raw ? JSON.parse(raw) : null;
      return (j && j.partnerUid) ? j : null;
    }catch(e){ return null; }
  }
  window.getMyCoupleInfo = getCouple;
  function setCouple(data){
    try{
      if(!data) localStorage.removeItem(COUPLE_KEY);
      else localStorage.setItem(COUPLE_KEY, JSON.stringify(data));
    }catch(e){}
  }
  function getQuest(){
    try{
      const raw = localStorage.getItem(QUEST_KEY);
      return raw ? JSON.parse(raw) : null;
    }catch(e){ return null; }
  }
  function setQuest(q){
    try{
      if(!q) localStorage.removeItem(QUEST_KEY);
      else localStorage.setItem(QUEST_KEY, JSON.stringify(q));
    }catch(e){}
  }

  function unlockedFx(){
    const p = (typeof getPlayerProfile==='function') ? getPlayerProfile() : {};
    return Array.isArray(p.unlockedFx) ? p.unlockedFx : [];
  }
  function unlockedBubbles(){
    const p = (typeof getPlayerProfile==='function') ? getPlayerProfile() : {};
    const list = Array.isArray(p.unlockedBubbles) ? p.unlockedBubbles.slice() : ['classic'];
    if(list.indexOf('classic')<0) list.unshift('classic');
    return list;
  }
  function currentBubbleStyle(){
    const p = (typeof getPlayerProfile==='function') ? getPlayerProfile() : {};
    const id = p.bubbleStyle || 'classic';
    return unlockedBubbles().indexOf(id)>=0 ? id : 'classic';
  }
  function isFxUnlocked(id){
    if(FREE_FX.some(f=>f.id===id)) return true;
    return unlockedFx().indexOf(id)>=0;
  }

  function ensureFxLayer(){
    if(fxLayer && fxLayer.isConnected) return fxLayer;
    const stage = document.getElementById('caro-stage');
    if(!stage) return null;
    fxLayer = document.getElementById('caro-fx-layer');
    if(!fxLayer){
      fxLayer = document.createElement('div');
      fxLayer.id = 'caro-fx-layer';
      stage.appendChild(fxLayer);
    }
    return fxLayer;
  }

  function avatarRect(which){
    // which: 'opp' | 'me' — ném từ avatar mình (dưới) vào avatar đối thủ (trên)
    const id = which === 'me' ? 'caro-me-avatar' : 'caro-opp-avatar';
    let el = document.getElementById(id);
    if(!el && which === 'me') el = document.getElementById('caro-opp-avatar');
    if(!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width/2, y: r.top + r.height/2, w: r.width, h: r.height };
  }

  function spawnProjectile(emoji, from, to, cls){
    const layer = ensureFxLayer();
    if(!layer || !from || !to) return;
    const el = document.createElement('div');
    el.className = 'caro-fx-proj '+(cls||'');
    el.textContent = emoji;
    const x0 = from.x, y0 = from.y;
    const x1 = to.x, y1 = to.y;
    el.style.left = x0+'px';
    el.style.top = y0+'px';
    layer.appendChild(el);
    requestAnimationFrame(()=>{
      el.style.transform = 'translate('+(x1-x0)+'px,'+(y1-y0)+'px) rotate(360deg) scale(1.2)';
      el.style.opacity = '0.15';
    });
    setTimeout(()=> el.remove(), 900);
  }

  function stampOnAvatar(which, cls, emoji, ms){
    const av = document.getElementById(which === 'me' ? 'caro-me-avatar' : 'caro-opp-avatar');
    if(!av) return;
    av.classList.add(cls);
    let stamp = av.querySelector('.caro-av-stamp');
    if(!stamp){
      stamp = document.createElement('span');
      stamp.className = 'caro-av-stamp';
      av.appendChild(stamp);
    }
    stamp.textContent = emoji || '';
    setTimeout(()=>{
      av.classList.remove(cls);
      if(stamp) stamp.textContent = '';
    }, ms || 1800);
  }

  function playFx(fxId, fromMine){
    // fromMine: mình ném → đối thủ; !fromMine: đối thủ ném → mình
    const from = avatarRect(fromMine ? 'me' : 'opp');
    const to = avatarRect(fromMine ? 'opp' : 'me');
    const hitWhich = fromMine ? 'opp' : 'me';
    const hit = (cls, emoji, ms)=> stampOnAvatar(hitWhich, cls, emoji, ms);
    const map = {
      egg:()=>{ spawnProjectile('🥚', from, to); setTimeout(()=>hit('hit-egg','💦',1400), 700); },
      tomato:()=>{ spawnProjectile('🍅', from, to); setTimeout(()=>hit('hit-tomato','💥',1400), 700); },
      slipper:()=>{ spawnProjectile('🩴', from, to, 'spin'); setTimeout(()=>hit('hit-slipper','💫',1400), 700); },
      rose:()=>{ spawnProjectile('🌹', from, to); setTimeout(()=>hit('hit-rose','✨',1600), 700); },
      handshake:()=>{ spawnProjectile('🤝', from, to); },
      heart:()=>{ spawnProjectile('❤️', from, to); setTimeout(()=>hit('hit-heart','💕',1600), 700); },
      fire:()=>{
        const layer = ensureFxLayer();
        if(!layer || !from || !to) return;
        const beam = document.createElement('div');
        beam.className = 'caro-fx-firebeam';
        const dx = to.x-from.x, dy = to.y-from.y;
        const len = Math.hypot(dx,dy);
        const ang = Math.atan2(dy,dx)*180/Math.PI;
        beam.style.left = from.x+'px';
        beam.style.top = from.y+'px';
        beam.style.width = len+'px';
        beam.style.transform = 'rotate('+ang+'deg)';
        layer.appendChild(beam);
        setTimeout(()=>{ hit('hit-fire','🔥',1600); beam.remove(); }, 700);
      },
      squid:()=>{ spawnProjectile('🦑', from, to); setTimeout(()=>hit('hit-ink','🖤',2200), 700); },
      cactus:()=>{ spawnProjectile('🌵', from, to); setTimeout(()=>hit('hit-cactus','📌',2000), 700); },
      flowers:()=>{
        for(let i=0;i<12;i++){
          setTimeout(()=> spawnProjectile(['🌸','🌺','🌼','💮'][i%4], from, {
            x: to.x + (Math.random()*80-40),
            y: to.y + (Math.random()*60-30)
          }), i*60);
        }
      },
      megaheart:()=>{
        const layer = ensureFxLayer();
        if(!layer) return;
        const end = Date.now()+2000;
        const tick = ()=>{
          if(Date.now()>end) return;
          const h = document.createElement('div');
          h.className = 'caro-fx-megaheart';
          h.textContent = ['💖','💗','❤️','💕'][(Math.random()*4)|0];
          h.style.left = (8+Math.random()*84)+'vw';
          h.style.top = (10+Math.random()*70)+'vh';
          h.style.fontSize = (22+Math.random()*34)+'px';
          layer.appendChild(h);
          setTimeout(()=>h.remove(), 900);
          setTimeout(tick, 120);
        };
        tick();
      }
    };
    if(map[fxId]) map[fxId]();
  }

  function setCoupleLine(el, couple){
    if(!el) return;
    if(!couple){
      el.hidden = true;
      el.textContent = '';
      return;
    }
    el.hidden = false;
    el.innerHTML = '<span class="caro-couple-ring">💍</span><span class="caro-couple-name">'+
      (typeof escapeHtml==='function'?escapeHtml(couple.partnerName||'…'):(couple.partnerName||'…'))+'</span>';
  }

  function renderCoupleHud(){
    const c = getCouple();
    setCoupleLine(document.getElementById('caro-me-couple-line'), c);
    // Dòng trên đối thủ chỉ hiện khi đang ghép với đúng người đang đấu
    const oppLine = document.getElementById('caro-couple-line');
    let showOpp = null;
    if(c && _caro && _caro.ids){
      const opp = (typeof _caroOppSlot==='function') ? _caroOppSlot() : 'guest';
      const idx = opp === 'host' ? 0 : 1;
      if(_caro.ids[idx] && _caro.ids[idx] === c.partnerUid) showOpp = c;
    }
    setCoupleLine(oppLine, showOpp);
  }

  function showFloatingBubble(text, style, mine){
    const stage = document.getElementById('caro-stage');
    if(!stage) return;
    if(getComputedStyle(stage).position === 'static') stage.style.position = 'relative';
    let host = document.getElementById('caro-bubble-host');
    if(!host){
      host = document.createElement('div');
      host.id = 'caro-bubble-host';
      stage.appendChild(host);
    }
    const b = document.createElement('div');
    b.className = 'caro-float-bubble style-'+(style||'classic')+(mine?' mine':'');
    b.textContent = text;
    const av = document.getElementById(mine ? 'caro-me-avatar' : 'caro-opp-avatar');
    if(av){
      const sr = stage.getBoundingClientRect();
      const ar = av.getBoundingClientRect();
      if(mine){
        b.style.left = Math.max(8, ar.left - sr.left)+'px';
        b.style.top = Math.max(8, ar.top - sr.top - 44)+'px';
        b.style.right = 'auto';
      } else {
        b.style.left = Math.min(sr.width - 40, ar.right - sr.left + 6)+'px';
        b.style.top = Math.max(8, ar.top - sr.top + 2)+'px';
      }
    }
    host.appendChild(b);
    const life = Math.max(1200, Math.min(2200, 900 + String(text).length*40));
    setTimeout(()=>{ b.classList.add('out'); setTimeout(()=>b.remove(), 280); }, life);
  }

  function enqueueBubble(msg){
    bubbleQueue.push(msg);
    if(bubbleTimer) return;
    const pump = ()=>{
      if(!bubbleQueue.length){ bubbleTimer=null; return; }
      const m = bubbleQueue.shift();
      const mine = m.uid && typeof getOnlineUid==='function' && m.uid===getOnlineUid();
      const style = m.bubbleStyle || (mine ? currentBubbleStyle() : 'classic');
      showFloatingBubble(m.text, style, mine);
      const delay = bubbleQueue.length > 3 ? 700 : 1100;
      bubbleTimer = setTimeout(pump, delay);
    };
    pump();
  }

  async function sendFx(fxId){
    if(!_caro) return;
    if(!isFxUnlocked(fxId)){
      try{
        await watchAd();
        const list = unlockedFx().slice();
        if(list.indexOf(fxId)<0) list.push(fxId);
        savePlayerProfile({ unlockedFx: list });
        renderFxBar();
      }catch(e){
        try{ showComboFlash(0,false, tt('caroAdFail','Cần xem quảng cáo')); }catch(e2){}
        return;
      }
    }
    const all = FREE_FX.concat(PREMIUM_FX);
    const fx = all.find(f=>f.id===fxId);
    if(!fx) return;
    // Ném ngay từ avatar mình → avatar đối thủ (không phải tin nhắn sticker)
    playFx(fx.id, true);
    if(!_caro.online || !_caro.roomId || typeof sendRoomChat !== 'function') return;
    try{
      await sendRoomChat(_caro.roomId, fx.emoji+' '+fx.label, {
        kind: 'fx',
        fxId: fx.id,
        bubbleStyle: currentBubbleStyle()
      });
    }catch(e){
      console.warn('[caro-fx]', e);
    }
  }

  async function sendCoupleInvite(){
    if(!_caro || !_caro.online || !_caro.roomId) return;
    try{ await watchAd(); }catch(e){
      try{ showComboFlash(0,false, tt('caroAdFail','Cần xem quảng cáo')); }catch(e2){}
      return;
    }
    const opp = (typeof _caroOppSlot==='function') ? _caroOppSlot() : 'guest';
    const idx = opp==='host' ? 0 : 1;
    const partnerUid = (_caro.ids && _caro.ids[idx]) || null;
    if(!partnerUid){
      try{ showComboFlash(0,false, tt('caroCoupleNeedOpp','Cần đối thủ online')); }catch(e){}
      return;
    }
    setQuest({
      partnerUid,
      partnerName: _caro.names[idx],
      partnerAvatar: (_caro.avatars&&_caro.avatars[idx])||'🐶',
      status: 'invited',
      myWin: false,
      theirWin: false,
      at: Date.now()
    });
    await sendRoomChat(_caro.roomId, '💍 '+tt('caroCoupleInvite','Mời kết đôi — cùng thắng máy Siêu!'), {
      kind: 'couple_invite',
      bubbleStyle: currentBubbleStyle()
    });
    try{ showComboFlash(0,false, tt('caroCoupleInvited','Đã gửi lời mời kết đôi')); }catch(e){}
  }

  async function acceptCoupleInvite(fromUid, fromName, fromAvatar){
    try{ await watchAd(); }catch(e){
      try{ showComboFlash(0,false, tt('caroAdFail','Cần xem quảng cáo')); }catch(e2){}
      return;
    }
    setQuest({
      partnerUid: fromUid,
      partnerName: fromName,
      partnerAvatar: fromAvatar || '🐶',
      status: 'questing',
      myWin: false,
      theirWin: false,
      at: Date.now()
    });
    if(_caro && _caro.roomId){
      await sendRoomChat(_caro.roomId, '💍 '+tt('caroCoupleAccepted','Đã nhận kết đôi — đi thắng máy Siêu!'), {
        kind: 'couple_accept',
        bubbleStyle: currentBubbleStyle()
      });
    }
    try{ showComboFlash(0,false, tt('caroCoupleQuestHint','Cùng thắng máy Siêu để ghép đôi')); }catch(e){}
  }

  function tryCompleteCouple(){
    const q = getQuest();
    if(!q || !q.partnerUid) return;
    if(q.myWin && q.theirWin){
      setCouple({
        partnerUid: q.partnerUid,
        partnerName: q.partnerName,
        partnerAvatar: q.partnerAvatar,
        pairedAt: Date.now()
      });
      setQuest(null);
      renderCoupleHud();
      try{ showComboFlash(0,false, '💍 '+tt('caroCoupleDone','Đã ghép đôi!')); }catch(e){}
    }
  }

  function onExtremeAiWin(){
    const q = getQuest();
    if(!q || !q.partnerUid) return;
    q.myWin = true;
    q.status = 'questing';
    setQuest(q);
    if(_caro && _caro.online && _caro.roomId){
      sendRoomChat(_caro.roomId, '✅ '+tt('caroCoupleExtremeWin','Đã thắng máy Siêu'), {
        kind: 'couple_extreme_win',
        bubbleStyle: currentBubbleStyle()
      }).catch(()=>{});
    }
    tryCompleteCouple();
  }

  function handleSocialMessage(msg){
    if(!msg) return;
    const mine = msg.uid && typeof getOnlineUid==='function' && msg.uid===getOnlineUid();
    if(msg.kind === 'fx' && msg.fxId){
      // Tin của mình đã play local khi chọn FX — chỉ phát lại khi đối thủ ném
      if(!mine) playFx(msg.fxId, false);
    }
    if(msg.kind === 'couple_invite' && !mine){
      // Hiện nút nhận trong chat row — handled in append; also toast
      try{
        showComboFlash(0,false, tt('caroCoupleIncoming','Có lời mời kết đôi — mở chat để nhận'));
      }catch(e){}
    }
    if(msg.kind === 'couple_accept' && !mine){
      const q = getQuest() || {};
      q.partnerUid = msg.uid;
      q.partnerName = msg.name;
      q.partnerAvatar = msg.avatar;
      q.status = 'questing';
      q.myWin = !!q.myWin;
      q.theirWin = false;
      setQuest(q);
    }
    if(msg.kind === 'couple_extreme_win' && !mine){
      const q = getQuest();
      if(q && q.partnerUid === msg.uid){
        q.theirWin = true;
        setQuest(q);
        tryCompleteCouple();
      }
    }
    if(msg.text && msg.kind !== 'fx'){
      enqueueBubble({
        text: msg.text,
        uid: msg.uid,
        bubbleStyle: msg.bubbleStyle || 'classic'
      });
    }
  }

  function fillFxButtons(host, opts){
    if(!host) return;
    const withCouple = !!(opts && opts.withCouple);
    host.innerHTML = '';
    FREE_FX.concat(PREMIUM_FX).forEach(fx=>{
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'caro-fx-btn'+(fx.premium && !isFxUnlocked(fx.id)?' locked':'');
      b.title = fx.label + (fx.premium && !isFxUnlocked(fx.id) ? ' 🔒 QC' : '');
      b.setAttribute('aria-label', fx.label);
      b.textContent = fx.emoji;
      b.addEventListener('click', ()=>{ try{sfxClick();}catch(e){} sendFx(fx.id); });
      host.appendChild(b);
    });
    if(withCouple){
      const coupleBtn = document.createElement('button');
      coupleBtn.type = 'button';
      coupleBtn.className = 'caro-fx-btn caro-fx-couple';
      coupleBtn.title = tt('caroCoupleBtn','Kết đôi (xem QC)');
      coupleBtn.textContent = '💍';
      coupleBtn.addEventListener('click', ()=>{ try{sfxClick();}catch(e){} sendCoupleInvite(); });
      host.appendChild(coupleBtn);
    }
  }

  function renderFxBar(){
    fillFxButtons(document.getElementById('caro-fx-bar'), { withCouple: true });
    fillFxButtons(document.getElementById('caro-quick-fx'), { withCouple: false });
  }

  function renderBubblePicker(){
    const wrap = document.getElementById('caro-bubble-picker');
    if(!wrap) return;
    wrap.innerHTML = '';
    const unlocked = unlockedBubbles();
    BUBBLE_STYLES.forEach(st=>{
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'caro-bubble-pick style-'+st.id+(currentBubbleStyle()===st.id?' active':'')+(unlocked.indexOf(st.id)<0?' locked':'');
      b.textContent = st.label;
      if(st.shop && unlocked.indexOf(st.id)<0) b.title = tt('caroBubbleBuyInShop','🔒 Mua trong Cửa hàng');
      b.addEventListener('click', async ()=>{
        try{sfxClick();}catch(e){}
        if(unlocked.indexOf(st.id)<0){
          if(st.shop){
            try{ showComboFlash(0,false, tt('caroBubbleBuyInShop','🔒 Mua trong Cửa hàng')); }catch(e2){}
            return;
          }
          try{
            await watchAd();
            const list = unlockedBubbles();
            if(list.indexOf(st.id)<0) list.push(st.id);
            savePlayerProfile({ unlockedBubbles: list, bubbleStyle: st.id });
          }catch(err){
            try{ showComboFlash(0,false, tt('caroAdFail','Cần xem quảng cáo')); }catch(e2){}
            return;
          }
        } else {
          savePlayerProfile({ bubbleStyle: st.id });
        }
        renderBubblePicker();
      });
      wrap.appendChild(b);
    });
  }

  function enhanceAppendChat(msg){
    handleSocialMessage(msg);
  }

  function onChatMessage(msg){
    enhanceAppendChat(msg);
  }

  function setupAvatarUpload(){
    const input = document.getElementById('pp-avatar-file');
    const btn = document.getElementById('pp-avatar-upload-btn');
    if(btn && input){
      btn.addEventListener('click', ()=>{ try{sfxClick();}catch(e){} input.click(); });
      input.addEventListener('change', ()=>{
        const file = input.files && input.files[0];
        if(!file) return;
        if(!file.type.startsWith('image/')) return;
        if(file.size > 900000){
          try{ showComboFlash(0,false, tt('caroAvatarTooBig','Ảnh quá lớn')); }catch(e){}
          return;
        }
        const reader = new FileReader();
        reader.onload = ()=>{
          const img = new Image();
          img.onload = ()=>{
            const max = 160;
            let w = img.width, h = img.height;
            const scale = Math.min(1, max/Math.max(w,h));
            w = Math.round(w*scale); h = Math.round(h*scale);
            const canvas = document.createElement('canvas');
            canvas.width = w; canvas.height = h;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, w, h);
            const data = canvas.toDataURL('image/jpeg', 0.72);
            savePlayerProfile({ customAvatar: data });
            try{ showComboFlash(0,false, tt('caroAvatarSaved','Đã lưu avatar')); }catch(e){}
            if(typeof renderAvatarPicker==='function') renderAvatarPicker(getPlayerProfile().avatar);
          };
          img.src = reader.result;
        };
        reader.readAsDataURL(file);
        input.value = '';
      });
    }
    const clearBtn = document.getElementById('pp-avatar-clear-btn');
    if(clearBtn){
      clearBtn.addEventListener('click', ()=>{
        try{sfxClick();}catch(e){}
        savePlayerProfile({ customAvatar: '' });
      });
    }
  }

  function initCaroSocial(){
    window.addEventListener('caro-ai-win', (ev)=>{
      const level = ev && ev.detail && ev.detail.level;
      if(level === 'extreme') onExtremeAiWin();
    });
    window.addEventListener('caro-couple-accept', (ev)=>{
      const msg = ev && ev.detail;
      if(msg) acceptCoupleInvite(msg.uid, msg.name, msg.avatar);
    });
    renderFxBar();
    renderBubblePicker();
    renderCoupleHud();
    setupAvatarUpload();
    document.getElementById('caro-chat-toggle')?.addEventListener('click', ()=>{
      setTimeout(()=>{ renderFxBar(); renderBubblePicker(); }, 30);
    });
  }

  window.CaroSocial = {
    renderFxBar, renderCoupleHud, renderBubblePicker, onExtremeAiWin,
    onChatMessage, acceptInvite: acceptCoupleInvite,
    getCouple, playFx, currentBubbleStyle, FREE_FX, PREMIUM_FX
  };

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initCaroSocial);
  else initCaroSocial();
})();
