// ═══════════════════════════════════════════════════════════════
// lb-notify.js — Thông báo "bị vượt hạng" trong BXH ngày/tuần/tháng.
// Đọc players/{uid}/notifications (ghi bởi Cloud Function submitSoloScore,
// xem functions/index.js) và hiện flash khi mở app — kéo người chơi quay
// lại giành hạng. Nạp SAU online-services.js + ui.js.
// ═══════════════════════════════════════════════════════════════
(function (g) {
  "use strict";

  const KIND_LABEL = { day: "ngày", week: "tuần", month: "tháng" };

  async function checkOvertakeNotifications() {
    try {
      if (typeof initOnlineServices !== "function") return;
      const ok = await initOnlineServices();
      if (!ok) return;
      const uid = typeof getOnlineUid === "function" ? getOnlineUid() : null;
      if (!uid || typeof _onlineDb === "undefined" || !_onlineDb) return;

      const snap = await _onlineDb
        .collection("players").doc(uid)
        .collection("notifications")
        .where("read", "==", false)
        .limit(10)
        .get();
      if (snap.empty) return;

      const docs = snap.docs.slice().sort((a, b) => {
        const ta = (a.data().createdAt && a.data().createdAt.toMillis) ? a.data().createdAt.toMillis() : 0;
        const tb = (b.data().createdAt && b.data().createdAt.toMillis) ? b.data().createdAt.toMillis() : 0;
        return ta - tb;
      }).slice(0, 5);

      const batch = _onlineDb.batch();
      let delay = 0;
      docs.forEach((doc) => {
        const d = doc.data() || {};
        if (d.type === "lb_overtaken") {
          const kindLabel = KIND_LABEL[d.kind] || KIND_LABEL.day;
          const msg = "⚔️ " + (d.byName || "Đối thủ") + " vừa vượt hạng của bạn trong BXH " + kindLabel + "!";
          setTimeout(() => {
            try { showComboFlash(0, false, msg); } catch (e) {}
          }, delay);
          delay += 2600;
        }
        batch.update(doc.ref, { read: true });
      });
      batch.commit().catch(() => {});
    } catch (e) {
      console.warn("[lb-notify]", e);
    }
  }

  g.checkOvertakeNotifications = checkOvertakeNotifications;

  function boot() {
    // Đợi vài giây cho màn hình chính + đăng nhập online ổn định trước khi
    // bắn flash, tránh chồng lên hiệu ứng mở app / màn hình chào.
    setTimeout(checkOvertakeNotifications, 3500);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})(typeof window !== "undefined" ? window : this);
