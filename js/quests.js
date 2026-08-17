// ═══════════════════════════════════════════════════════════════
// js/quests.js — Nhiệm vụ ngày / tuần / tháng (màn hình fullscreen)
// Nạp SAU daily-rewards.js + inventory.js, TRƯỚC ui.js / main.js
// ═══════════════════════════════════════════════════════════════
(function (g) {
  "use strict";

  const KEY_PREFIX = "chromablast_quests_";
  let _view = null; // null (not opened yet) | day | week | month

  function tt(key, fallback) {
    try {
      if (typeof t === "function") {
        const v = t(key);
        if (v != null && v !== key) return v;
      }
    } catch (e) {}
    return fallback != null ? fallback : key;
  }

  function ttf(key, fallback) {
    const args = Array.prototype.slice.call(arguments, 2);
    try {
      if (typeof t === "function") {
        const v = t.apply(null, [key].concat(args));
        if (v != null && v !== key) return v;
      }
    } catch (e) {}
    let s = fallback != null ? String(fallback) : String(key);
    args.forEach(function (a, i) {
      s = s.split("{" + i + "}").join(a);
    });
    return s;
  }

  function who() {
    try {
      if (typeof currentUser !== "undefined" && currentUser && currentUser.username)
        return currentUser.username;
    } catch (e) {}
    return "_guest";
  }

  function storageKey() {
    return KEY_PREFIX + who();
  }

  function todayStr() {
    if (typeof g.todayStr === "function") return g.todayStr();
    const d = new Date();
    return (
      d.getFullYear() +
      "-" +
      String(d.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(d.getDate()).padStart(2, "0")
    );
  }

  function weekKey(d) {
    d = d || new Date();
    const tmp = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const dayNum = tmp.getUTCDay() || 7;
    tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil(((tmp - yearStart) / 86400000 + 1) / 7);
    return tmp.getUTCFullYear() + "-W" + String(weekNo).padStart(2, "0");
  }

  function monthKey(d) {
    d = d || new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
  }

  /** Khoá "YYYY-MM-DD" cho 1 ngày — dùng làm key trong st.checkins. */
  function checkinDayKey(y, m, day) {
    return y + "-" + String(m).padStart(2, "0") + "-" + String(day).padStart(2, "0");
  }
  function todayCheckinKey() {
    const d = new Date();
    return checkinDayKey(d.getFullYear(), d.getMonth() + 1, d.getDate());
  }
  function currentMonthKey() {
    return monthKey();
  }

  function emptyBucket() {
    return { play: 0, clears: 0, scoreMax: 0, spin: 0, comboMax: 0, claimed: {} };
  }

  function defaultState() {
    return {
      dayKey: todayStr(),
      weekKey: weekKey(),
      monthKey: monthKey(),
      day: emptyBucket(),
      week: emptyBucket(),
      month: emptyBucket(),
      checkins: {},
    };
  }

  function loadState() {
    let st = defaultState();
    try {
      const raw =
        (typeof safeGet === "function" ? safeGet(storageKey()) : null) ||
        localStorage.getItem(storageKey());
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") st = Object.assign(st, parsed);
      }
    } catch (e) {}
    rollPeriods(st);
    return st;
  }

  function saveState(st) {
    try {
      const payload = JSON.stringify(st);
      if (typeof safeSet === "function") safeSet(storageKey(), payload);
      else localStorage.setItem(storageKey(), payload);
    } catch (e) {}
  }

  function rollPeriods(st) {
    const d = todayStr();
    const w = weekKey();
    const m = monthKey();
    if (st.dayKey !== d) {
      st.dayKey = d;
      st.day = emptyBucket();
    }
    if (st.weekKey !== w) {
      st.weekKey = w;
      st.week = emptyBucket();
    }
    if (st.monthKey !== m) {
      st.monthKey = m;
      st.month = emptyBucket();
    }
    if (!st.checkins || typeof st.checkins !== "object") st.checkins = {};
    ["day", "week", "month"].forEach(function (k) {
      if (!st[k] || typeof st[k] !== "object") st[k] = emptyBucket();
      if (!st[k].claimed) st[k].claimed = {};
    });
  }

  /** Định nghĩa nhiệm vụ */
  const QUEST_DEFS = {
    day: [
      { id: "checkin", icon: "🎁", target: 1, metric: "checkin", reward: { xp: 0, gold: 0, hearts: 0 }, useDailyClaim: true },
      { id: "play1", icon: "🎮", target: 1, metric: "play", reward: { xp: 15, gold: 1, hearts: 0 } },
      { id: "clear3", icon: "💥", target: 3, metric: "clears", reward: { xp: 20, gold: 1, hearts: 0 } },
      { id: "score300", icon: "⭐", target: 300, metric: "scoreMax", reward: { xp: 25, gold: 1, hearts: 0 } },
      { id: "spin1", icon: "🎡", target: 1, metric: "spin", reward: { xp: 10, gold: 1, hearts: 0 } },
    ],
    week: [
      { id: "play5", icon: "🎮", target: 5, metric: "play", reward: { xp: 60, gold: 3, hearts: 1 } },
      { id: "clear30", icon: "💥", target: 30, metric: "clears", reward: { xp: 80, gold: 4, hearts: 1 } },
      { id: "login3", icon: "📅", target: 3, metric: "weekCheckins", reward: { xp: 50, gold: 3, hearts: 1 } },
      { id: "combo5", icon: "🔥", target: 5, metric: "comboMax", reward: { xp: 70, gold: 3, hearts: 0 } },
    ],
    month: [
      { id: "login15", icon: "🗓️", target: 15, metric: "monthCheckins", reward: { xp: 200, gold: 10, hearts: 2 } },
      { id: "play20", icon: "🎮", target: 20, metric: "play", reward: { xp: 180, gold: 8, hearts: 2 } },
      { id: "clear100", icon: "💥", target: 100, metric: "clears", reward: { xp: 220, gold: 12, hearts: 2 } },
      { id: "combo8", icon: "🔥", target: 8, metric: "comboMax", reward: { xp: 150, gold: 6, hearts: 1 } },
    ],
  };

  function countCheckinsInRange(st, startMs, endMs) {
    let n = 0;
    Object.keys(st.checkins || {}).forEach(function (k) {
      if (!st.checkins[k]) return;
      const t0 = new Date(k + "T00:00:00").getTime();
      if (t0 >= startMs && t0 <= endMs) n++;
    });
    return n;
  }

  function weekBounds() {
    const now = new Date();
    const day = now.getDay() || 7; // Mon=1 … Sun=7
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (day - 1));
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return { start: start.getTime(), end: end.getTime() };
  }

  function monthBounds() {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    return { start: start.getTime(), end: end.getTime() };
  }

  function progressOf(st, cat, def) {
    const bucket = st[cat] || emptyBucket();
    if (def.metric === "checkin") {
      return st.checkins && st.checkins[todayCheckinKey()] ? 1 : 0;
    }
    if (def.metric === "weekCheckins") {
      const b = weekBounds();
      return countCheckinsInRange(st, b.start, b.end);
    }
    if (def.metric === "monthCheckins") {
      const b = monthBounds();
      return countCheckinsInRange(st, b.start, b.end);
    }
    return Math.max(0, bucket[def.metric] | 0);
  }

  function isClaimed(st, cat, id) {
    return !!(st[cat] && st[cat].claimed && st[cat].claimed[id]);
  }

  function periodKeyFor(cat) {
    if (cat === "day") return todayStr();
    if (cat === "week") { const b = weekBounds(); return new Date(b.start).toISOString().slice(0, 10); }
    if (cat === "month") { const b = monthBounds(); return new Date(b.start).toISOString().slice(0, 7); }
    return todayStr();
  }

  /** Phần vàng/tim đi qua Cloud Function claimGpcardReward (server tự tính lại đúng
   * số theo QUEST_DEFS — không tin số reward client gửi lên), rồi mới cộng cục bộ
   * đúng số server trả về; XP vẫn cộng cục bộ như cũ (không phải tiền tệ, không cần
   * khoá server). Trả về false nếu server từ chối (mất mạng, hoặc đã nhận trước đó
   * ở phiên/thiết bị khác) — khi đó KHÔNG đánh dấu đã nhận cục bộ, để người chơi
   * còn thấy nút và thử lại thay vì bị kẹt "coi như đã nhận" mà ví không có tiền.
   */
  async function grantReward(reward, cat, id) {
    reward = reward || {};
    if (reward.xp && typeof addPlayerXP === "function") addPlayerXP(reward.xp | 0);
    if (!((reward.gold | 0) > 0 || (reward.hearts | 0) > 0)) return true;
    if (typeof _getOnlineFunctions !== "function") return false;
    const fns = _getOnlineFunctions();
    if (!fns) return false;
    let walletRes = null;
    try {
      const res = await fns.httpsCallable("claimGpcardReward")({ kind: "quest", period: cat, id, periodKey: periodKeyFor(cat) });
      walletRes = (res && res.data) || null;
    } catch (e) {
      if (e && e.message === "Đã nhận thưởng này rồi.") return true; // đã nhận từ trước — không chặn UI
      return false;
    }
    if (!walletRes) return false;
    if (walletRes.gold > 0 && typeof grantGold === "function") grantGold(walletRes.gold, tt("questsReward", "Nhiệm vụ"));
    if (walletRes.hearts > 0) {
      try {
        if (typeof grantDailyQuestHearts === "function") grantDailyQuestHearts(walletRes.hearts, tt("questsReward", "Nhiệm vụ"));
        else if (typeof grantHearts === "function") grantHearts(walletRes.hearts, tt("questsReward", "Nhiệm vụ"));
      } catch (e) {}
    }
    try { if (typeof syncWalletFromServer === "function") await syncWalletFromServer(); } catch (e) {}
    return true;
  }

  async function claimQuest(cat, id) {
    const st = loadState();
    const def = (QUEST_DEFS[cat] || []).find(function (q) {
      return q.id === id;
    });
    if (!def) return { ok: false };
    if (isClaimed(st, cat, id)) return { ok: false, reason: "claimed" };

    if (def.useDailyClaim) {
      if (typeof claimDailyReward !== "function") return { ok: false };
      const res = claimDailyReward();
      if (!res) return { ok: false, reason: "claimed" };
      st.checkins[todayCheckinKey()] = 1;
      st[cat].claimed[id] = 1;
      saveState(st);
      try {
        if (typeof updateDailyBadge === "function") updateDailyBadge();
      } catch (e) {}
      return { ok: true, daily: res, reward: { xp: res.xp, gold: res.gold, hearts: res.hearts } };
    }

    const prog = progressOf(st, cat, def);
    if (prog < def.target) return { ok: false, reason: "progress" };
    const granted = await grantReward(def.reward, cat, id);
    if (!granted) return { ok: false, reason: "network" };
    st[cat].claimed[id] = 1;
    saveState(st);
    try {
      if (typeof logGameEvent === "function") logGameEvent("quest_complete", { category: cat, quest_id: id });
    } catch (e) {}
    return { ok: true, reward: def.reward };
  }

  function syncCheckinFromDaily(st) {
    try {
      // Điểm danh theo tháng: chép các ngày đã điểm danh trong tháng hiện tại
      // từ daily-rewards (key "YYYY-MM-DD" theo dayOfMonth) sang quests.checkins.
      const ds =
        typeof getDailyState === "function"
          ? getDailyState()
          : null;
      const now = new Date();
      const mk = currentMonthKey();
      if (ds && ds.months && ds.months[mk]) {
        Object.keys(ds.months[mk]).forEach(function (day) {
          const n = Number(day);
          if (n >= 1 && n <= 31) {
            st.checkins[checkinDayKey(now.getFullYear(), now.getMonth() + 1, n)] = 1;
          }
        });
        // Tương thích bản cũ: bản cũ lưu theo key "YYYY-MM-DD" trong checkins
        if (ds.lastClaim) st.checkins[ds.lastClaim] = 1;
      } else if (ds && ds.lastClaim) {
        st.checkins[ds.lastClaim] = 1;
      }
      if (typeof getDailyStatus === "function") {
        const s = getDailyStatus();
        if (s && s.alreadyClaimedToday) st.checkins[todayCheckinKey()] = 1;
      }
      // Đã điểm danh hôm nay → đánh dấu quest checkin đã nhận (tránh nút Nhận kẹt)
      if (st.checkins[todayCheckinKey()] || st.checkins[todayStr()]) {
        if (!st.day.claimed) st.day.claimed = {};
        st.day.claimed.checkin = 1;
      }
    } catch (e) {}
  }

  /** Ghi tiến độ từ gameplay */
  function noteQuestEvent(type, amount) {
    amount = amount == null ? 1 : Number(amount) || 0;
    if (!(amount > 0) && type !== "score" && type !== "combo") return;
    const st = loadState();
    syncCheckinFromDaily(st);

    function bump(metric, n, mode) {
      ["day", "week", "month"].forEach(function (cat) {
        const b = st[cat];
        if (mode === "max") b[metric] = Math.max(b[metric] | 0, n);
        else b[metric] = (b[metric] | 0) + n;
      });
    }

    if (type === "play") bump("play", amount, "add");
    else if (type === "clear") bump("clears", amount, "add");
    else if (type === "score") bump("scoreMax", amount, "max");
    else if (type === "spin") bump("spin", amount, "add");
    else if (type === "combo") bump("comboMax", amount, "max");
    else if (type === "checkin") st.checkins[todayCheckinKey()] = 1;

    saveState(st);
    if (_view) renderDetail(_view);
    updateQuestsBadge();
  }

  const QUEST_TITLE_FB = {
    checkin: "Điểm danh hôm nay",
    play1: "Chơi 1 ván",
    clear3: "Phá 3 hàng",
    score300: "Đạt 300 điểm",
    spin1: "Quay vòng quay 1 lần",
    play5: "Chơi 5 ván trong tuần",
    clear30: "Phá 30 hàng trong tuần",
    login3: "Điểm danh 3 ngày trong tuần",
    combo5: "Đạt combo x5",
    login15: "Điểm danh 15 ngày trong tháng",
    play20: "Chơi 20 ván trong tháng",
    clear100: "Phá 100 hàng trong tháng",
    combo8: "Đạt combo x8",
  };
  function questTitle(def) {
    return tt("quest_" + def.id, QUEST_TITLE_FB[def.id] || def.id);
  }

  function rewardText(reward) {
    if (!reward) return "";
    const parts = [];
    if (reward.xp) parts.push("+" + reward.xp + " XP");
    if (reward.gold) parts.push("🪙 +" + reward.gold);
    if (reward.hearts) parts.push("❤️ +" + reward.hearts);
    return parts.join(" · ");
  }

  function renderMonthCalendar(st) {
    const cal = document.getElementById("quests-month-cal");
    if (!cal) return;
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const firstDow = new Date(y, m, 1).getDay(); // 0 Sun
    const startPad = (firstDow + 6) % 7; // Mon-first
    const today = todayStr();
    const canClaimToday =
      typeof getDailyStatus === "function" ? getDailyStatus().canClaim : !st.checkins[todayCheckinKey()];
    cal.innerHTML = "";
    const head = document.createElement("div");
    head.className = "quests-cal-head";
    head.textContent = ttf("questsCalMonth", "Tháng {0}/{1}", m + 1, y);
    cal.appendChild(head);
    const grid = document.createElement("div");
    grid.className = "quests-cal-grid";
    ["T2", "T3", "T4", "T5", "T6", "T7", "CN"].forEach(function (lab) {
      const el = document.createElement("div");
      el.className = "quests-cal-dow";
      el.textContent = lab;
      grid.appendChild(el);
    });
    for (let i = 0; i < startPad; i++) {
      const blank = document.createElement("div");
      blank.className = "quests-cal-day empty";
      grid.appendChild(blank);
    }
    for (let day = 1; day <= daysInMonth; day++) {
      const key = checkinDayKey(y, m + 1, day);
      const cell = document.createElement("div");
      let cls = "quests-cal-day";
      if (st.checkins[key]) cls += " claimed";
      else if (key === today) cls += canClaimToday ? " available" : " today";
      else if (key > today) cls += " future";
      else cls += " missed";
      // Ngày rương đặc biệt (3/7/14/21/30/31)
      const chestTier =
        typeof checkinChestForDay === "function"
          ? checkinChestForDay(day)
          : null;
      cell.className = cls;
      cell.textContent = String(day);
      if (chestTier) {
        cls += " chest";
        cell.className = cls;
        cell.style.setProperty("--chest-tint", chestTier.tier.tint);
        const chestEl = document.createElement("div");
        chestEl.className = "quests-cal-chest";
        chestEl.textContent = chestTier.tier.icon;
        cell.appendChild(chestEl);
      }
      grid.appendChild(cell);
    }
    cal.appendChild(grid);
  }

  function renderDetail(cat) {
    _view = cat;
    const list = document.getElementById("quests-list");
    const checkWrap = document.getElementById("quests-checkin-wrap");
    const head = document.getElementById("quests-head-title");
    document.querySelectorAll("[data-quest-cat]").forEach(function (btn) {
      btn.classList.toggle("active", btn.getAttribute("data-quest-cat") === cat);
    });
    if (head) {
      head.textContent =
        cat === "day"
          ? tt("questsDay", "Nhiệm vụ ngày")
          : cat === "week"
            ? tt("questsWeek", "Nhiệm vụ tuần")
            : tt("questsMonth", "Nhiệm vụ tháng");
    }
    const st = loadState();
    syncCheckinFromDaily(st);
    saveState(st);
    if (!list) return;
    list.innerHTML = "";
    (QUEST_DEFS[cat] || []).forEach(function (def) {
      const prog = Math.min(def.target, progressOf(st, cat, def));
      const claimed = isClaimed(st, cat, def.id);
      const done = prog >= def.target || (def.useDailyClaim && !!st.checkins[todayCheckinKey()]);
      const row = document.createElement("div");
      row.className =
        "quests-row" + (claimed ? " claimed" : done ? " ready" : "");
      const pct = Math.min(100, Math.round((prog / def.target) * 100));
      row.innerHTML =
        '<div class="quests-row-ico">' +
        def.icon +
        "</div>" +
        '<div class="quests-row-main">' +
        '<div class="quests-row-title">' +
        questTitle(def) +
        "</div>" +
        '<div class="quests-row-reward">' +
        (def.useDailyClaim
          ? tt("questsCheckinReward", "XP + vàng + tim")
          : rewardText(def.reward)) +
        "</div>" +
        '<div class="quests-bar"><i style="width:' +
        pct +
        '%"></i></div>' +
        '<div class="quests-row-prog">' +
        prog +
        "/" +
        def.target +
        "</div>" +
        "</div>" +
        '<button type="button" class="quests-claim-btn"' +
        (claimed || !done ? " disabled" : "") +
        ">" +
        (claimed
          ? tt("questsClaimed", "Đã nhận")
          : tt("questsClaim", "Nhận")) +
        "</button>";
      row.querySelector(".quests-claim-btn")?.addEventListener("click", function () {
        try {
          if (typeof sfxClick === "function") sfxClick();
        } catch (e) {}
        const r = claimQuest(cat, def.id);
        if (r && r.ok) {
          try {
            if (typeof sfxUnlock === "function") sfxUnlock();
          } catch (e) {}
          const rw = r.reward || {};
          try {
            if (typeof showComboFlash === "function")
              showComboFlash(
                0,
                false,
                tt("questsClaimFlash", "Nhiệm vụ hoàn thành") +
                  (rw.xp ? " · +" + rw.xp + " XP" : "") +
                  (rw.gold ? " · 🪙 +" + rw.gold : "") +
                  (rw.hearts ? " · ❤️ +" + rw.hearts : "")
              );
          } catch (e) {}
          renderDetail(cat);
          updateQuestsBadge();
        }
      });
      list.appendChild(row);
    });

    if (checkWrap) {
      const showCal = cat === "day" || cat === "month";
      checkWrap.hidden = !showCal;
      if (showCal) {
        renderMonthCalendar(st);
        const btn = document.getElementById("quests-checkin-btn");
        if (btn) {
          const can =
            typeof getDailyStatus === "function" ? getDailyStatus().canClaim : !st.checkins[todayCheckinKey()];
          btn.disabled = !can;
          btn.textContent = can
            ? tt("questsCheckinBtn", "🎁 Điểm danh hôm nay")
            : tt("dailyClaimed", "✅ Đã điểm danh hôm nay");
        }
      }
    }
  }

  function showHub() {
    renderDetail("day");
  }

  function openQuestsScreen(cat) {
    try {
      if (typeof closeAllSettingsOverlays === "function") closeAllSettingsOverlays();
    } catch (e) {}
    try {
      if (typeof closeSettingsHub === "function") closeSettingsHub();
    } catch (e) {}
    // Đóng panel modal khác để không lẫn
    [
      "shop-panel",
      "friends-panel",
      "account-panel",
      "player-profile-panel",
      "leaderboard-panel",
      "settings-panel",
      "settings-more-panel",
      "gpcard-sub-leaderboard",
      "gpcard-panel",
      "gpcard-rewards-screen",
      "gpcard-redeem-screen",
    ].forEach(function (id) {
      document.getElementById(id)?.classList.remove("show");
    });
    const screen = document.getElementById("quests-screen");
    if (!screen) return;
    screen.classList.add("show");
    screen.setAttribute("aria-hidden", "false");
    renderDetail(cat && QUEST_DEFS[cat] ? cat : "day");
    updateQuestsBadge();
  }

  function closeQuestsScreen() {
    const screen = document.getElementById("quests-screen");
    if (!screen) return;
    screen.classList.remove("show");
    screen.setAttribute("aria-hidden", "true");
  }

  function questsHandleBack() {
    const screen = document.getElementById("quests-screen");
    if (!screen || !screen.classList.contains("show")) return false;
    closeQuestsScreen();
    return true;
  }

  function hasClaimable() {
    const st = loadState();
    syncCheckinFromDaily(st);
    let yes = false;
    Object.keys(QUEST_DEFS).forEach(function (cat) {
      QUEST_DEFS[cat].forEach(function (def) {
        if (isClaimed(st, cat, def.id)) return;
        const prog = progressOf(st, cat, def);
        const done =
          prog >= def.target || (def.useDailyClaim && !!st.checkins[todayCheckinKey()]);
        // checkin claimable if daily can claim
        if (def.useDailyClaim) {
          try {
            if (typeof getDailyStatus === "function" && getDailyStatus().canClaim) yes = true;
          } catch (e) {}
          return;
        }
        if (done) yes = true;
      });
    });
    return yes;
  }

  function updateQuestsBadge() {
    const btn = document.getElementById("set-btn-quests");
    if (btn) btn.classList.toggle("has-quest", hasClaimable());
    // Badge điểm danh (có thể nhận thưởng hôm nay) gắn cùng nút Nhiệm vụ —
    // cập nhật qua updateDailyBadge() (js/daily-rewards.js).
  }

  function initQuestsUI() {
    // ══════════════════════════════════════════════════════════════════
    // ĐÃ CHỐT — KHÔNG ĐỔI LẠI: nút "Nhiệm vụ" trong Menu chính (set-btn-quests)
    // PHẢI mở thẳng #quests-screen qua openQuestsScreen(), giống hệt nút
    // "Nhiệm vụ" trong Tài khoản (js/account-hub.js: acchub-btn-quests).
    // Thẻ trò chơi (gpcard-panel) KHÔNG có tab Nhiệm vụ — đã bỏ chủ đích;
    // màn Nhiệm vụ gpcard (file cũ) đã xoá, KHÔNG tạo lại. Nếu định làm lại
    // giao diện Nhiệm vụ kiểu gpcard, phải hỏi lại người yêu cầu trước, đây
    // không phải lỗi cần "sửa".
    // ══════════════════════════════════════════════════════════════════
    document.getElementById("set-btn-quests")?.addEventListener("click", function () {
      try {
        if (typeof sfxClick === "function") sfxClick();
      } catch (e) {}
      document.getElementById('settings-panel')?.classList.remove('show');
      openQuestsScreen();
    });
    document.getElementById("quests-close-btn")?.addEventListener("click", function () {
      try {
        if (typeof sfxClick === "function") sfxClick();
      } catch (e) {}
      closeQuestsScreen();
    });
    document.getElementById("quests-back-btn")?.addEventListener("click", function () {
      try {
        if (typeof sfxClick === "function") sfxClick();
      } catch (e) {}
      questsHandleBack();
    });
    document.querySelectorAll("[data-quest-cat]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        try {
          if (typeof sfxClick === "function") sfxClick();
        } catch (e) {}
        renderDetail(btn.getAttribute("data-quest-cat"));
      });
    });
    document.getElementById("quests-checkin-btn")?.addEventListener("click", function () {
      try {
        if (typeof sfxClick === "function") sfxClick();
      } catch (e) {}
      const r = claimQuest("day", "checkin");
      if (r && r.ok) {
        try {
          if (typeof sfxUnlock === "function") sfxUnlock();
        } catch (e) {}
        try {
          if (typeof showComboFlash === "function" && r.daily) {
            let msg = typeof t === "function"
              ? t("dailyFlash", r.daily.xp, r.daily.day, r.daily.hearts | 0)
              : "🎁 Điểm danh";
            if (r.daily.milestone) {
              const m = r.daily.milestone;
              msg += " · " + (typeof t === "function" ? t("dailyMilestoneFlash", m.day) : ("Mốc " + m.day + " ngày!"));
              if (m.tier && m.tier.name) msg += " " + m.tier.icon + " " + m.tier.name;
              if (m.gold) msg += " 🪙+" + m.gold;
              if (m.diamonds) msg += " 💎+" + m.diamonds;
              if (m.crate) msg += " " + m.crate.label;
            }
            showComboFlash(0, false, msg);
          }
        } catch (e) {}
        renderDetail(_view || "day");
        updateQuestsBadge();
      }
    });

    // Đồng bộ trạng thái điểm danh từ daily-rewards (điểm danh giờ nằm trong
    // lịch tháng của màn Nhiệm vụ này)
    const st = loadState();
    syncCheckinFromDaily(st);
    saveState(st);
    updateQuestsBadge();
  }

  g.noteQuestEvent = noteQuestEvent;
  g.openQuestsScreen = openQuestsScreen;
  g.closeQuestsScreen = closeQuestsScreen;
  g.questsHandleBack = questsHandleBack;
  g.initQuestsUI = initQuestsUI;
  g.updateQuestsBadge = updateQuestsBadge;

  // API export cho các module khác (account-hub.js, gpcard.js...) — chỉ đọc/ghi
  // đúng state và hàm tính điểm/tiến độ/nhận thưởng đã có ở trên, không có logic
  // tính toán nào mới. Đặt tên có tiền tố "quests" để tránh trùng với
  // loadState/saveState riêng của các module khác (brick-skins.js, map-boards.js)
  // cũng đang dùng tên đó cho state của module đó.
  g.QUEST_DEFS = QUEST_DEFS;
  g.questsLoadState = loadState;
  g.questsSaveState = saveState;
  g.questsSyncCheckin = syncCheckinFromDaily;
  g.questsProgressOf = progressOf;
  g.questsIsClaimed = isClaimed;
  g.questsClaim = claimQuest;
  g.questsTitleOf = questTitle;
  g.questsRewardText = rewardText;
})(typeof window !== "undefined" ? window : globalThis);
