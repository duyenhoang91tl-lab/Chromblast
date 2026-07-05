// ═══════════════════════════════════════════════════════════════
// js/mechConfig.js — CẤU HÌNH "NHỊP & THƯỞNG" cho 20 cơ chế độ khó (admin chỉnh).
// MECH_DEFAULTS/MECH_CFG + MCFG()/loadMechCfg/renderMechCfg. Nạp SAU save.js, TRƯỚC
// roundMechanics.js (dùng MCFG lúc chạy). Lưu bền qua localStorage (save.js).
// ═══════════════════════════════════════════════════════════════

/* ══════════════════════════════════════════
   ⚙️ MỤC NHỊP & THƯỞNG — cấu hình trung tâm cho 20 cơ chế độ khó map thường
   nhịp  = số bước đặt khối giữa 2 lần cơ chế hoạt động (nhỏ hơn = khó hơn)
   thưởng = điểm nhận khi hóa giải cơ chế
   Chỉnh trực tiếp trong panel admin "⚙️ Nhịp & Thưởng" — lưu bền qua localStorage.
══════════════════════════════════════════ */
const MECH_DEFAULTS={
  mountain:   {label:'⛰️ Núi lan rộng',      nhip:10},
  squirrel:   {label:'🐿️ Sóc trộm ô',        nhip:3,  thuong:50, hp:10, limit:15},
  ice:        {label:'🧊 Băng giá',           nhip:7},
  fog:        {label:'🌫️ Sương mù trôi',      nhip:4},
  bomb:       {label:'💣 Bom hẹn giờ',        nhip:8,  thuong:20, phat:15},
  tornado:    {label:'🌪️ Lốc xoáy',           nhip:15},
  egg:        {label:'🥚 Trứng rồng nở',      nhip:12, thuong:40},
  spider:     {label:'🕷️ Nhện giăng tơ',      nhip:6,  thuong:30, hp:5},
  cloud:      {label:'🌧️ Mây mưa rửa màu',    nhip:6},
  cham:       {label:'🦎 Tắc kè đổi màu',     nhip:8},
  bh:         {label:'🕳️ Hố đen nuốt ô',      nhip:10, thuong:35},
  ghost:      {label:'👻 Bóng ma đội lốt',    nhip:7,  thuong:25},
  snail:      {label:'🐌 Ốc sên nhớt',                 thuong:30},
  wall:       {label:'🧱 Tường gạch rơi',     nhip:14},
  lightning:  {label:'⚡ Sét đánh',           nhip:9},
  snakeSpirit:{label:'🐍 Rắn thần',                    thuong:60, hp:5},
  volcano:    {label:'🌋 Núi lửa phun đá',    nhip:15},
  portal:     {label:'🌀 Cổng dịch chuyển',   nhip:5,  thuong:40},
  dk:         {label:'🐲 Vua Rồng',           nhip:12, thuong:100, hp:15},
};
let MECH_CFG=JSON.parse(JSON.stringify(MECH_DEFAULTS));
(function loadMechCfg(){
  const saved=getSavedMechCfg();
  Object.keys(saved).forEach(k=>{
    if(!MECH_CFG[k]) return;
    ['nhip','thuong','phat'].forEach(fld=>{
      const v=parseInt(saved[k]&&saved[k][fld],10);
      if(!isNaN(v)&&v>=0) MECH_CFG[k][fld]=v;
    });
  });
})();
function MCFG(k,fld){ return MECH_CFG[k][fld]; }
function renderMechCfg(){
  const list=document.getElementById('mechcfg-list'); if(!list) return;
  list.innerHTML='';
  Object.keys(MECH_CFG).forEach(k=>{
    const m=MECH_CFG[k];
    const row=document.createElement('div');
    row.style.cssText='display:flex;align-items:center;gap:8px;padding:5px 2px;border-bottom:1px solid rgba(255,255,255,0.08);font-size:12px;color:#ddd;';
    let html='<span style="flex:1;text-align:left;">'+m.label+'</span>';
    if(m.nhip!=null) html+='<label style="color:#8fd3ff;">Nhịp <input data-k="'+k+'" data-f="nhip" type="number" min="1" max="99" value="'+m.nhip+'" style="width:44px;background:#1a1a2e;color:#fff;border:1px solid rgba(255,255,255,0.25);border-radius:5px;padding:2px 4px;"></label>';
    if(m.thuong!=null) html+='<label style="color:#ffd700;">Thưởng <input data-k="'+k+'" data-f="thuong" type="number" min="0" max="999" value="'+m.thuong+'" style="width:52px;background:#1a1a2e;color:#fff;border:1px solid rgba(255,255,255,0.25);border-radius:5px;padding:2px 4px;"></label>';
    if(m.phat!=null) html+='<label style="color:#ff6b6b;">Phạt <input data-k="'+k+'" data-f="phat" type="number" min="0" max="999" value="'+m.phat+'" style="width:52px;background:#1a1a2e;color:#fff;border:1px solid rgba(255,255,255,0.25);border-radius:5px;padding:2px 4px;"></label>';
    row.innerHTML=html;
    list.appendChild(row);
  });
  list.querySelectorAll('input').forEach(inp=>{
    inp.addEventListener('change',()=>{
      const k=inp.dataset.k, fld=inp.dataset.f;
      let v=parseInt(inp.value,10);
      if(isNaN(v)) v=MECH_DEFAULTS[k][fld];
      v=Math.max(fld==='nhip'?1:0, Math.min(999,v));
      inp.value=v; MECH_CFG[k][fld]=v;
      saveMechCfg();
    });
  });
}
