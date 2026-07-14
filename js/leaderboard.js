// ═══════════════════════════════════════════════════════════════
// js/leaderboard.js — BẢNG XẾP HẠNG TRÊN THIẾT BỊ
//
// Bản phát hành CH Play: lưu điểm cao nhất của từng người chơi TRÊN MÁY NÀY
// (localStorage) — chỉ hiển thị điểm THẬT, không còn dữ liệu giả lập.
//
// ĐỂ NÂNG CẤP THÀNH "TOÀN CẦU" (đồng bộ mọi máy qua server, vd Firebase
// Firestore hoặc Google Play Games Services): chỉ cần viết lại nội dung
// bên trong 3 hàm submitScoreToLeaderboard() / fetchTopScores() /
// fetchMyRank() để gọi API thay vì đọc/ghi localStorage. Toàn bộ phần UI
// bên dưới và các chỗ gọi 3 hàm này (engine.js) KHÔNG cần sửa gì thêm.
//
// Nạp SAU save.js, TRƯỚC main.js.
// ═══════════════════════════════════════════════════════════════

const LEADERBOARD_KEY = 'chromablast_leaderboard_local';
// Điểm giả lập từng seed ở bản dev — nhận diện để dọn khỏi máy đã cài bản cũ.
const LEADERBOARD_DEV_SEED = [
  {name:'Minh',        score: 4820},
  {name:'Huyền Trang',  score: 3960},
  {name:'Quang',        score: 3510},
  {name:'Bảo Anh',      score: 2870},
  {name:'Nam',          score: 2340},
];

function getLeaderboardEntries(){
  let entries = [];
  try{
    const raw = safeGet(LEADERBOARD_KEY);
    if(raw) entries = JSON.parse(raw) || [];
  }catch(e){ entries = []; }
  // Dọn dữ liệu giả từ bản dev cũ (khớp đúng cả tên lẫn điểm mới xoá — không đụng người chơi thật trùng tên)
  const cleaned = entries.filter(e => !LEADERBOARD_DEV_SEED.some(s => s.name===e.name && s.score===e.score));
  if(cleaned.length !== entries.length) safeSet(LEADERBOARD_KEY, JSON.stringify(cleaned));
  return cleaned;
}

function currentPlayerName(){
  if(typeof currentUser !== 'undefined' && currentUser && currentUser.username) return currentUser.username;
  let gid = safeGet('chromablast_guest_name');
  if(!gid){
    gid = 'Khách#' + Math.floor(1000 + Math.random()*9000);
    safeSet('chromablast_guest_name', gid);
  }
  return gid;
}

// Gửi điểm lên bảng — chỉ giữ điểm CAO NHẤT của mỗi tên (tránh spam nhiều dòng trùng người chơi).
function submitScoreToLeaderboard(score){
  if(!score || score <= 0) return;
  const name = currentPlayerName();
  let entries = getLeaderboardEntries();
  const idx = entries.findIndex(e => e.name === name);
  if(idx >= 0){
    if(score > entries[idx].score) entries[idx].score = score;
  } else {
    entries.push({name, score});
  }
  entries.sort((a,b) => b.score - a.score);
  entries = entries.slice(0, 100); // giữ top 100
  safeSet(LEADERBOARD_KEY, JSON.stringify(entries));
}

function fetchTopScores(limit){
  const entries = getLeaderboardEntries().slice().sort((a,b) => b.score - a.score);
  return entries.slice(0, limit || 10);
}

function fetchMyRank(){
  const name = currentPlayerName();
  const entries = getLeaderboardEntries().slice().sort((a,b) => b.score - a.score);
  const idx = entries.findIndex(e => e.name === name);
  return idx >= 0 ? { rank: idx+1, score: entries[idx].score, total: entries.length } : null;
}

function escapeHtml(s){
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function renderLeaderboardPanel(){
  const list = document.getElementById('leaderboard-list');
  if(list){
    const top = fetchTopScores(20);
    const myName = currentPlayerName();
    list.innerHTML = '';
    if(!top.length){
      list.innerHTML = '<div class="lb-empty">Chưa có điểm nào — chơi để lên bảng đầu tiên!</div>';
    }
    top.forEach((e,i) => {
      const row = document.createElement('div');
      row.className = 'lb-row' + (e.name === myName ? ' me' : '');
      const medal = i===0 ? '🥇' : i===1 ? '🥈' : i===2 ? '🥉' : String(i+1);
      row.innerHTML = '<span class="lb-rank">'+medal+'</span>'
        + '<span class="lb-name">'+escapeHtml(e.name)+'</span>'
        + '<span class="lb-score">'+e.score.toLocaleString()+'</span>';
      list.appendChild(row);
    });
  }
  const myRankBox = document.getElementById('leaderboard-my-rank');
  if(myRankBox){
    const mine = fetchMyRank();
    myRankBox.textContent = mine
      ? ('Hạng của bạn: #' + mine.rank + ' / ' + mine.total + ' — ' + mine.score.toLocaleString() + ' điểm')
      : 'Bạn chưa có điểm nào trên bảng xếp hạng — chơi 1 ván để lên bảng!';
  }
}

function initLeaderboardPanel(){
  const btn = document.getElementById('leaderboard-btn');
  const panel = document.getElementById('leaderboard-panel');
  if(!btn || !panel) return;
  function openPanel(){
    if(typeof sfxClick === 'function') sfxClick();
    renderLeaderboardPanel();
    panel.classList.add('show');
  }
  function closePanel(){ panel.classList.remove('show'); }
  btn.addEventListener('click', openPanel);
  document.getElementById('leaderboard-close-btn').addEventListener('click', closePanel);
  panel.addEventListener('click', (e) => { if(e.target === panel) closePanel(); });
}
