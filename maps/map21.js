// ═══════════════════════════════════════════════════════════════
// maps/map21.js — MAP NGOÀI mẫu (được MapManager nạp động khi startMap(21))
// Đây là TEMPLATE cho các map mới: đặt file maps/mapNN.js, khai báo hàm
// enterMapNN vào global, rồi đăng ký {id:NN, file:'maps/mapNN.js',
// enterName:'enterMapNN'} trong mapManager.js. KHÔNG cần sửa switch/if nào.
// ═══════════════════════════════════════════════════════════════

function enterMap21(){
  // Overlay đơn giản chứng minh cơ chế nạp động hoạt động.
  let ov = document.getElementById('map21-demo');
  if(!ov){
    ov = document.createElement('div');
    ov.id = 'map21-demo';
    ov.style.cssText = 'position:fixed;inset:0;z-index:20000;display:flex;flex-direction:column;'
      + 'align-items:center;justify-content:center;gap:16px;background:rgba(10,10,30,0.94);color:#fff;'
      + 'font-family:system-ui,sans-serif;text-align:center;padding:24px;';
    ov.innerHTML = '<div style="font-size:40px">🧩</div>'
      + '<div style="font-size:20px;font-weight:800;color:#ffd700">MAP 21 — nạp động thành công!</div>'
      + '<div style="max-width:320px;opacity:0.85;font-size:13px">File <b>maps/map21.js</b> vừa được '
      + 'MapManager tải về theo yêu cầu (lazy-load). Đây là mẫu để tạo map mới.</div>'
      + '<button id="map21-back" style="background:linear-gradient(135deg,#56AB2F,#A8E063);border:none;'
      + 'border-radius:10px;color:#062;font-weight:800;font-size:15px;padding:10px 22px;cursor:pointer">↩ Quay lại</button>';
    document.body.appendChild(ov);
    ov.querySelector('#map21-back').addEventListener('click', ()=>{ ov.style.display='none'; });
  }
  ov.style.display = 'flex';
}
