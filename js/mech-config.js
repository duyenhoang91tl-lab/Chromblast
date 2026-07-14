// ═══════════════════════════════════════════════════════════════
// js/mech-config.js — CẤU HÌNH "NHỊP & THƯỞNG" cho 20 cơ chế độ khó map thường.
// Bản phát hành CH Play: giá trị CỐ ĐỊNH theo MECH_DEFAULTS (đã gỡ panel admin
// chỉnh sửa; không đọc đè từ localStorage nữa để mọi người chơi có cùng độ khó).
// Nạp SAU save.js, TRƯỚC round-mechanics.js (cơ chế đọc MCFG lúc chạy).
// ═══════════════════════════════════════════════════════════════

/* ══════════════════════════════════════════
   nhịp  = số bước đặt khối giữa 2 lần cơ chế hoạt động (nhỏ hơn = khó hơn)
   thưởng = điểm nhận khi hóa giải cơ chế · phạt = điểm trừ khi dính đòn
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
// Bản phát hành: MECH_CFG luôn = mặc định, không đọc đè từ localStorage
// (giá trị chỉnh tay từ bản dev cũ nếu còn sót sẽ bị bỏ qua).
const MECH_CFG=JSON.parse(JSON.stringify(MECH_DEFAULTS));
function MCFG(k,fld){ return MECH_CFG[k][fld]; }
