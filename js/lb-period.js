// ═══════════════════════════════════════════════════════════════
// lb-period.js — BXH ngày/tuần/tháng + thưởng top 1–100 (+ kim cương top 1–3)
// Nạp SAU inventory.js + geo-region.js + online-services.js
// ═══════════════════════════════════════════════════════════════
(function (g) {
  "use strict";

  const LOCAL_PERIOD_KEY = "chromablast_period_scores";
  const CLAIM_KEY = "chromablast_lb_claims";

  function pad2(n) {
    return String(n).padStart(2, "0");
  }

  function utcParts(d) {
    d = d || new Date();
    return {
      y: d.getUTCFullYear(),
      m: d.getUTCMonth() + 1,
      day: d.getUTCDate(),
      time: d.getTime(),
    };
  }

  /** ISO week id UTC */
  function isoWeekId(d) {
    d = d ? new Date(d) : new Date();
    const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
    const dayNum = date.getUTCDay() || 7;
    date.setUTCDate(date.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil(((date - yearStart) / 86400000 + 1) / 7);
    return date.getUTCFullYear() + "-W" + pad2(weekNo);
  }

  function periodKey(kind, when) {
    const d = when ? new Date(when) : new Date();
    const p = utcParts(d);
    if (kind === "day") return "d-" + p.y + "-" + pad2(p.m) + "-" + pad2(p.day);
    if (kind === "week") return "w-" + isoWeekId(d);
    if (kind === "month") return "m-" + p.y + "-" + pad2(p.m);
    return periodKey("day", when);
  }

  function previousPeriodKey(kind) {
    const now = new Date();
    if (kind === "day") {
      return periodKey("day", new Date(now.getTime() - 86400000));
    }
    if (kind === "week") {
      return periodKey("week", new Date(now.getTime() - 7 * 86400000));
    }
    if (kind === "month") {
      const y = now.getUTCFullYear();
      const m = now.getUTCMonth(); // 0-based current
      const prev = m === 0 ? new Date(Date.UTC(y - 1, 11, 15)) : new Date(Date.UTC(y, m - 1, 15));
      return periodKey("month", prev);
    }
    return periodKey(kind);
  }

  /**
   * Quà theo hạng — ngày < tuần < tháng.
   * Kim cương chỉ top 1–3.
   */
  const REWARD_TABLE = {
    day: [
      { max: 1, gold: 50, diamond: 3 },
      { max: 2, gold: 30, diamond: 2 },
      { max: 3, gold: 20, diamond: 1 },
      { max: 10, gold: 12, diamond: 0 },
      { max: 20, gold: 8, diamond: 0 },
      { max: 40, gold: 5, diamond: 0 },
      { max: 60, gold: 3, diamond: 0 },
      { max: 80, gold: 2, diamond: 0 },
      { max: 100, gold: 1, diamond: 0 },
    ],
    week: [
      { max: 1, gold: 200, diamond: 6 },
      { max: 2, gold: 120, diamond: 3 },
      { max: 3, gold: 80, diamond: 2 },
      { max: 10, gold: 40, diamond: 0 },
      { max: 20, gold: 25, diamond: 0 },
      { max: 40, gold: 15, diamond: 0 },
      { max: 60, gold: 10, diamond: 0 },
      { max: 80, gold: 6, diamond: 0 },
      { max: 100, gold: 3, diamond: 0 },
    ],
    month: [
      { max: 1, gold: 800, diamond: 10 },
      { max: 2, gold: 500, diamond: 5 },
      { max: 3, gold: 300, diamond: 3 },
      { max: 10, gold: 150, diamond: 0 },
      { max: 20, gold: 90, diamond: 0 },
      { max: 40, gold: 50, diamond: 0 },
      { max: 60, gold: 30, diamond: 0 },
      { max: 80, gold: 18, diamond: 0 },
      { max: 100, gold: 10, diamond: 0 },
    ],
  };

  function rewardForRank(kind, rank) {
    rank = rank | 0;
    if (rank < 1 || rank > 100) return null;
    const table = REWARD_TABLE[kind] || REWARD_TABLE.day;
    for (let i = 0; i < table.length; i++) {
      if (rank <= table[maxKey(table[i])]) {
        return { gold: table[i].gold | 0, diamond: table[i].diamond | 0, rank: rank };
      }
    }
    return null;
  }
  function maxKey(row) {
    return row.max;
  }

  function loadLocalPeriodStore() {
    try {
      return JSON.parse(
        (typeof safeGet === "function" ? safeGet(LOCAL_PERIOD_KEY) : null) ||
          localStorage.getItem(LOCAL_PERIOD_KEY) ||
          "{}"
      );
    } catch (e) {
      return {};
    }
  }
  function saveLocalPeriodStore(st) {
    try {
      const s = JSON.stringify(st || {});
      if (typeof safeSet === "function") safeSet(LOCAL_PERIOD_KEY, s);
      else localStorage.setItem(LOCAL_PERIOD_KEY, s);
    } catch (e) {}
  }

  function loadClaims() {
    try {
      return JSON.parse(
        (typeof safeGet === "function" ? safeGet(CLAIM_KEY) : null) ||
          localStorage.getItem(CLAIM_KEY) ||
          "{}"
      );
    } catch (e) {
      return {};
    }
  }
  function saveClaims(st) {
    try {
      const s = JSON.stringify(st || {});
      if (typeof safeSet === "function") safeSet(CLAIM_KEY, s);
      else localStorage.setItem(CLAIM_KEY, s);
    } catch (e) {}
  }
  function hasClaimed(periodId) {
    const st = loadClaims();
    return !!(st && st[periodId]);
  }
  function markClaimed(periodId, meta) {
    const st = loadClaims();
    st[periodId] = Object.assign({ at: Date.now() }, meta || {});
    saveClaims(st);
  }

  function localPlayerId() {
    try {
      if (typeof getOnlineUid === "function" && getOnlineUid()) return getOnlineUid();
    } catch (e) {}
    return "local:" + (typeof currentPlayerName === "function" ? currentPlayerName() : "guest");
  }

  /** Ghi điểm kỳ (local + online) */
  function submitPeriodScore(score) {
    if (!(score > 0)) return;
    const region =
      typeof getPlayerRegion === "function"
        ? getPlayerRegion()
        : { country: "VN", continent: "AS" };
    const name =
      typeof currentPlayerName === "function" ? currentPlayerName() : "Player";
    const avatar =
      typeof getPlayerAvatar === "function" ? getPlayerAvatar() : "🐶";
    const uid = localPlayerId();
    const kinds = ["day", "week", "month"];
    const store = loadLocalPeriodStore();
    kinds.forEach(function (kind) {
      const key = periodKey(kind);
      if (!store[key]) store[key] = {};
      const prev = store[key][uid];
      if (!prev || score > (prev.score | 0)) {
        store[key][uid] = {
          uid: uid,
          name: name,
          avatar: avatar,
          score: score | 0,
          country: region.country,
          continent: region.continent,
          at: Date.now(),
        };
      }
    });
    saveLocalPeriodStore(store);
    if (typeof submitPeriodScoreOnline === "function") {
      submitPeriodScoreOnline(score, region).catch(function () {});
    }
  }

  function localPeriodEntries(periodId) {
    const store = loadLocalPeriodStore();
    const map = store[periodId] || {};
    return Object.keys(map)
      .map(function (k) {
        return map[k];
      })
      .filter(function (e) {
        return e && (e.score | 0) > 0;
      })
      .sort(function (a, b) {
        return (b.score | 0) - (a.score | 0);
      })
      .slice(0, 100)
      .map(function (e, i) {
        return {
          rank: i + 1,
          name: e.name || "Player",
          score: e.score | 0,
          playerId: e.uid,
          avatar: e.avatar || "🐶",
          country: e.country,
          continent: e.continent,
        };
      });
  }

  function filterEntries(entries, scope, region) {
    region = region || (typeof getPlayerRegion === "function" ? getPlayerRegion() : {});
    if (scope === "country") {
      return entries
        .filter(function (e) {
          return e.country === region.country;
        })
        .map(function (e, i) {
          return Object.assign({}, e, { rank: i + 1 });
        });
    }
    if (scope === "continent") {
      return entries
        .filter(function (e) {
          return e.continent === region.continent;
        })
        .map(function (e, i) {
          return Object.assign({}, e, { rank: i + 1 });
        });
    }
    if (scope === "friends") {
      const friends =
        typeof getFriendsList === "function" ? getFriendsList() : [];
      const ids = {};
      friends.forEach(function (f) {
        if (f && f.uid) ids[f.uid] = true;
      });
      ids[localPlayerId()] = true;
      return entries
        .filter(function (e) {
          return ids[e.playerId];
        })
        .map(function (e, i) {
          return Object.assign({}, e, { rank: i + 1 });
        });
    }
    return entries;
  }

  async function fetchPeriodLeaderboard(kind, scope, opts) {
    opts = opts || {};
    const usePrev = !!opts.previous;
    const periodId = usePrev ? previousPeriodKey(kind) : periodKey(kind);
    let entries = [];
    if (typeof fetchPeriodLeaderboardOnline === "function") {
      try {
        entries = (await fetchPeriodLeaderboardOnline(periodId, 120)) || [];
      } catch (e) {
        entries = [];
      }
    }
    if (!entries.length) entries = localPeriodEntries(periodId);
    // Merge local best for self if higher
    const local = localPeriodEntries(periodId);
    const mineLocal = local.find(function (e) {
      return e.playerId === localPlayerId();
    });
    if (mineLocal) {
      const idx = entries.findIndex(function (e) {
        return e.playerId === mineLocal.playerId;
      });
      if (idx < 0) entries.push(mineLocal);
      else if (mineLocal.score > entries[idx].score) entries[idx] = mineLocal;
      entries.sort(function (a, b) {
        return b.score - a.score;
      });
      entries = entries.slice(0, 100).map(function (e, i) {
        return Object.assign({}, e, { rank: i + 1 });
      });
    }
    const filtered = filterEntries(entries, scope || "world");
    return { periodId: periodId, kind: kind, scope: scope || "world", entries: filtered };
  }

  async function findMyPeriodRank(kind, scope, opts) {
    const board = await fetchPeriodLeaderboard(kind, scope, opts);
    const uid = localPlayerId();
    const name =
      typeof currentPlayerName === "function" ? currentPlayerName() : "";
    const mine = board.entries.find(function (e) {
      return e.playerId === uid || e.name === name;
    });
    return {
      periodId: board.periodId,
      rank: mine ? mine.rank : null,
      score: mine ? mine.score : 0,
      total: board.entries.length,
      entry: mine || null,
    };
  }

  /**
   * TRƯỚC ĐÂY: hàm này tự đọc leaderboard đã fetch (fetchPeriodLeaderboard —
   * có thể lẫn dữ liệu localStorage tự chế trên máy), tự tính hạng, rồi gọi
   * thẳng grantGold/grantDiamonds ở CLIENT — không có bước nào ở SERVER xác
   * nhận lại hạng trước khi cấp thưởng (functions/index.js đã xây sẵn Cloud
   * Function claimPeriodReward tự query periodScores để xác thực, nhưng
   * hàm này trước đó chưa hề gọi tới — xem docs/SERVER_WALLET_PROGRESS.md).
   * Giờ gọi qua claimPeriodRewardOnline (Cloud Function) trước — CHỈ khi
   * server xác nhận đủ điều kiện mới cộng gold/diamond cục bộ theo đúng số
   * server trả về, không tự tính nữa. scope giữ tham số cho tương thích chỗ
   * gọi cũ nhưng không còn dùng — server chỉ xét hạng THẾ GIỚI (periodScores
   * không có khái niệm scope theo bạn bè/khu vực).
   */
  async function claimPeriodReward(kind, scope) {
    const periodId = previousPeriodKey(kind);
    const claimKey = periodId + ":world";
    if (hasClaimed(claimKey)) {
      return { ok: false, reason: "claimed" };
    }
    if (typeof claimPeriodRewardOnline !== "function") {
      return { ok: false, reason: "offline" };
    }
    let res;
    try {
      res = await claimPeriodRewardOnline(kind);
    } catch (e) {
      const code = (e && e.code) || "";
      if (code.indexOf("already-exists") !== -1) {
        markClaimed(claimKey, {}); // đồng bộ lại cache cục bộ cho khớp server
        return { ok: false, reason: "claimed" };
      }
      if (code.indexOf("failed-precondition") !== -1) {
        return { ok: false, reason: "rank" };
      }
      // unauthenticated / unavailable / network-request-failed / mất mạng...
      return { ok: false, reason: "offline" };
    }
    if (!res || !(res.gold > 0 || res.diamond > 0)) {
      return { ok: false, reason: "rank" };
    }
    if (res.gold > 0 && typeof grantGold === "function") {
      grantGold(res.gold, "🏆 Top " + res.rank);
    }
    if (res.diamond > 0 && typeof grantDiamonds === "function") {
      grantDiamonds(res.diamond, "🏆 Top " + res.rank);
    }
    markClaimed(claimKey, { rank: res.rank, gold: res.gold, diamond: res.diamond });
    if (typeof logGameEvent === "function") {
      logGameEvent("claim_reward", { kind: kind, rank: res.rank, gold: res.gold, diamond: res.diamond });
    }
    return { ok: true, periodId: periodId, rank: res.rank, gold: res.gold, diamond: res.diamond };
  }

  function rewardPreviewRows(kind) {
    const table = REWARD_TABLE[kind] || REWARD_TABLE.day;
    const rows = [];
    let prev = 0;
    table.forEach(function (row) {
      const from = prev + 1;
      const to = row.max;
      rows.push({
        from: from,
        to: to,
        gold: row.gold,
        diamond: row.diamond,
        label: from === to ? "#" + from : "#" + from + "–" + to,
      });
      prev = row.max;
    });
    return rows;
  }

  // Hook score submit
  const _origSubmit = g.submitScoreToLeaderboard;
  // Will be wired after leaderboard.js loads — also export for direct call

  g.periodKey = periodKey;
  g.previousPeriodKey = previousPeriodKey;
  g.rewardForRank = rewardForRank;
  g.rewardPreviewRows = rewardPreviewRows;
  g.submitPeriodScore = submitPeriodScore;
  g.fetchPeriodLeaderboard = fetchPeriodLeaderboard;
  g.findMyPeriodRank = findMyPeriodRank;
  g.claimPeriodReward = claimPeriodReward;
  g.hasClaimedPeriod = function (periodId, scope) {
    return hasClaimed(periodId + ":" + (scope || "world"));
  };
  g.REWARD_TABLE = REWARD_TABLE;
})(typeof window !== "undefined" ? window : this);
