(function (global) {
  'use strict';

  // Từ/cụm từ đơn (so khớp theo từng token, chính xác tuyệt đối sau khi chuẩn hoá).
  var SINGLE_WORDS = [
    // Tiếng Việt
    'dit', 'du', 'deo', 'di', 'diem', 'lon', 'buoi', 'cac', 'dai',
    'nung', 'pho',
    'dm', 'dmm', 'vl', 'vcl', 'vloz', 'clm', 'cc', 'clgt',
    'djt', 'djtme', 'dcm', 'dkm', 'dkmm', 'cmm', 'cmn', 'cmnr', 'kmn', 'ml', 'mml',
    // Tiếng Anh
    'fuck', 'fucker', 'motherfucker', 'shit', 'bitch', 'asshole', 'bastard',
    'dick', 'pussy', 'cunt', 'faggot', 'nigger', 'whore', 'slut', 'damn', 'crap'
  ];

  // Cụm nhiều từ (so khớp theo chuỗi các token liền kề, cách nhau đúng 1 khoảng trắng).
  var PHRASES = [
    'deo me', 'du me', 'du ma', 'ma may', 'do cho', 'con cho', 'thang cho',
    'oc cho', 'cho chet', 'do khon', 'khon nan', 'mat day', 'vo hoc',
    'suc vat', 'oc lon', 'thang ngu', 'con ngu', 'con diem', 'di thoa',
    'vai lon', 'vai ca lon', 'deo biet', 'cut me may', 'du dm',
    'dam dang', 'di me'
  ];

  // Những từ hợp lệ hay bị trùng dạng không dấu với từ tục -> không lọc.
  var WHITELIST = ['buoi', 'du', 'di', 'cc', 'ml']; // buổi/dù/dì có thể trùng "buồi/đụ/đĩ"; giữ lại theo ngữ cảnh, admin có thể xoá khỏi whitelist nếu muốn lọc chặt hơn.

  function stripDiacritics(str) {
    return String(str || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D');
  }

  // Chuẩn hoá 1 token: chữ thường, bỏ dấu, gộp ký tự lặp liên tiếp,
  // bỏ dấu câu chèn giữa các chữ cái để bắt kiểu né lọc kiểu "d.m", "c-c".
  function normalizeToken(tok) {
    var s = stripDiacritics(String(tok || '').toLowerCase());
    s = s.replace(/[^a-z0-9]/g, '');
    s = s.replace(/(.)\1{2,}/g, '$1$1');
    return s;
  }

  var SINGLE_SET = {};
  SINGLE_WORDS.forEach(function (w) { SINGLE_SET[normalizeToken(w)] = true; });
  var WHITELIST_SET = {};
  WHITELIST.forEach(function (w) { WHITELIST_SET[normalizeToken(w)] = true; });
  var PHRASE_LIST = PHRASES.map(function (p) {
    return p.split(/\s+/).map(normalizeToken).filter(Boolean);
  });

  function tokenize(text) {
    // Giữ lại vị trí gốc của từng token để có thể thay thế bằng dấu *.
    var tokens = [];
    var re = /\S+/g;
    var m;
    var str = String(text || '');
    while ((m = re.exec(str)) !== null) {
      tokens.push({ raw: m[0], start: m.index, end: m.index + m[0].length, norm: normalizeToken(m[0]) });
    }
    return tokens;
  }

  function isBadSingle(norm) {
    if (!norm) return false;
    if (WHITELIST_SET[norm]) return false;
    return !!SINGLE_SET[norm];
  }

  function containsProfanity(text) {
    var tokens = tokenize(text);
    for (var i = 0; i < tokens.length; i++) {
      if (isBadSingle(tokens[i].norm)) return true;
    }
    for (var p = 0; p < PHRASE_LIST.length; p++) {
      var phrase = PHRASE_LIST[p];
      for (var j = 0; j + phrase.length <= tokens.length; j++) {
        var match = true;
        for (var k = 0; k < phrase.length; k++) {
          if (tokens[j + k].norm !== phrase[k]) { match = false; break; }
        }
        if (match) return true;
      }
    }
    return false;
  }

  function maskRange(chars, start, end) {
    for (var i = start; i < end; i++) {
      if (/[a-zA-Z0-9À-ỹ]/.test(chars[i])) chars[i] = '*';
    }
  }

  function filterText(text) {
    var original = String(text || '');
    if (!original) return original;
    var tokens = tokenize(original);
    var chars = original.split('');
    var flagged = false;

    for (var i = 0; i < tokens.length; i++) {
      if (isBadSingle(tokens[i].norm)) {
        maskRange(chars, tokens[i].start, tokens[i].end);
        flagged = true;
      }
    }
    for (var p = 0; p < PHRASE_LIST.length; p++) {
      var phrase = PHRASE_LIST[p];
      for (var j = 0; j + phrase.length <= tokens.length; j++) {
        var match = true;
        for (var k = 0; k < phrase.length; k++) {
          if (tokens[j + k].norm !== phrase[k]) { match = false; break; }
        }
        if (match) {
          maskRange(chars, tokens[j].start, tokens[j + phrase.length - 1].end);
          flagged = true;
        }
      }
    }
    return flagged ? chars.join('') : original;
  }

  var ProfanityFilter = {
    filterText: filterText,
    containsProfanity: containsProfanity,
    _normalizeToken: normalizeToken
  };
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = ProfanityFilter;
  } else {
    global.ProfanityFilter = ProfanityFilter;
  }
})(typeof window !== 'undefined' ? window : this);
