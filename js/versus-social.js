// ═══════════════════════════════════════════════════════════════
// js/versus-social.js — Icon tương tác (ném đồ) + bong bóng chat cho Đấu 1-1
// Nạp SAU versus.js / versus-ui.js (dùng _vs / sendRoomChat / showRewardedAd)
// Dùng chung kho vật phẩm đã mở khoá với Caro (getPlayerProfile/savePlayerProfile)
// ═══════════════════════════════════════════════════════════════

(function(){
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
    { id:'ink',     label:'Mực', premium:true }
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
    const stage = document.getElementById('versus-arena');
    if(!stage) return null;
    fxLayer = document.getElementById('vs-fx-layer');
    if(!fxLayer){
      fxLayer = document.createElement('div');
      fxLayer.id = 'vs-fx-layer';
      stage.appendChild(fxLayer);
    }
    return fxLayer;
  }

  function avatarRect(which){
    // which: 'opp' | 'me' — ném từ avatar mình (idx0) vào avatar đối thủ (idx1)
    const id = which === 'me' ? 'vs-chip-avatar0' : 'vs-chip-avatar1';
    const el = document.getElementById(id);
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
    const av = document.getElementById(which === 'me' ? 'vs-chip-avatar0' : 'vs-chip-avatar1');
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

  function showFloatingBubble(text, style, mine){
    const stage = document.getElementById('versus-arena');
    if(!stage) return;
    let host = document.getElementById('vs-bubble-host');
    if(!host){
      host = document.createElement('div');
      host.id = 'vs-bubble-host';
      stage.appendChild(host);
    }
    const b = document.createElement('div');
    b.className = 'caro-float-bubble style-'+(style||'classic')+(mine?' mine':'');
    b.textContent = text;
    const av = document.getElementById(mine ? 'vs-chip-avatar0' : 'vs-chip-avatar1');
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
    if(!_vs) return;
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
    if(!_vs.online || !_vs.online.roomId || typeof sendRoomChat !== 'function') return;
    try{
      await sendRoomChat(_vs.online.roomId, fx.emoji+' '+fx.label, {
        kind: 'fx',
        fxId: fx.id,
        bubbleStyle: currentBubbleStyle()
      });
    }catch(e){
      console.warn('[versus-fx]', e);
    }
  }

  function handleSocialMessage(msg){
    if(!msg) return;
    const mine = msg.uid && typeof getOnlineUid==='function' && msg.uid===getOnlineUid();
    if(msg.kind === 'fx' && msg.fxId){
      // Tin của mình đã play local khi chọn FX — chỉ phát lại khi đối thủ ném
      if(!mine) playFx(msg.fxId, false);
    }
    if(msg.text && msg.kind !== 'fx'){
      enqueueBubble({
        text: msg.text,
        uid: msg.uid,
        bubbleStyle: msg.bubbleStyle || 'classic'
      });
    }
  }

  function fillFxButtons(host){
    if(!host) return;
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
  }

  function renderFxBar(){
    fillFxButtons(document.getElementById('vs-fx-bar'));
  }

  function renderBubblePicker(){
    const wrap = document.getElementById('vs-bubble-picker');
    if(!wrap) return;
    wrap.innerHTML = '';
    const unlocked = unlockedBubbles();
    BUBBLE_STYLES.forEach(st=>{
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'caro-bubble-pick style-'+st.id+(currentBubbleStyle()===st.id?' active':'')+(unlocked.indexOf(st.id)<0?' locked':'');
      b.textContent = st.label;
      b.addEventListener('click', async ()=>{
        try{sfxClick();}catch(e){}
        if(unlocked.indexOf(st.id)<0){
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

  window.VersusSocial = {
    renderFxBar, renderBubblePicker, onChatMessage: handleSocialMessage,
    playFx, currentBubbleStyle, FREE_FX, PREMIUM_FX
  };
})();
