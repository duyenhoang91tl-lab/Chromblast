// ═══════════════════════════════════════════════════════════════
// geo-region.js — Quốc gia / châu lục cho BXH khu vực
// Nạp SAU save.js, TRƯỚC online-services / leaderboard
// ═══════════════════════════════════════════════════════════════
(function (g) {
  "use strict";

  const KEY = "chromablast_region";

  /** Mã quốc gia → châu lục */
  const CONTINENT_BY_CC = {
    VN: "AS", TH: "AS", ID: "AS", MY: "AS", SG: "AS", PH: "AS", LA: "AS", KH: "AS", MM: "AS",
    CN: "AS", JP: "AS", KR: "AS", TW: "AS", HK: "AS", IN: "AS", BD: "AS", PK: "AS", NP: "AS",
    AE: "AS", SA: "AS", IL: "AS", TR: "AS", IQ: "AS", IR: "AS", KZ: "AS", UZ: "AS",
    US: "NA", CA: "NA", MX: "NA", GT: "NA", CU: "NA", DO: "NA",
    BR: "SA", AR: "SA", CL: "SA", CO: "SA", PE: "SA", VE: "SA", UY: "SA", EC: "SA",
    GB: "EU", IE: "EU", FR: "EU", DE: "EU", ES: "EU", IT: "EU", PT: "EU", NL: "EU", BE: "EU",
    CH: "EU", AT: "EU", SE: "EU", NO: "EU", DK: "EU", FI: "EU", PL: "EU", CZ: "EU", RO: "EU",
    HU: "EU", GR: "EU", UA: "EU", RU: "EU",
    AU: "OC", NZ: "OC", FJ: "OC",
    EG: "AF", ZA: "AF", NG: "AF", KE: "AF", MA: "AF", GH: "AF", TZ: "AF", ET: "AF",
  };

  const CONTINENT_LABEL = {
    AS: { vi: "Châu Á", en: "Asia" },
    EU: { vi: "Châu Âu", en: "Europe" },
    NA: { vi: "Bắc Mỹ", en: "North America" },
    SA: { vi: "Nam Mỹ", en: "South America" },
    AF: { vi: "Châu Phi", en: "Africa" },
    OC: { vi: "Châu Đại Dương", en: "Oceania" },
    WW: { vi: "Thế giới", en: "World" },
  };

  const COUNTRY_LABEL = {
    VN: { vi: "Việt Nam", en: "Vietnam" },
    US: { vi: "Hoa Kỳ", en: "United States" },
    JP: { vi: "Nhật Bản", en: "Japan" },
    KR: { vi: "Hàn Quốc", en: "South Korea" },
    CN: { vi: "Trung Quốc", en: "China" },
    TH: { vi: "Thái Lan", en: "Thailand" },
    ID: { vi: "Indonesia", en: "Indonesia" },
    MY: { vi: "Malaysia", en: "Malaysia" },
    SG: { vi: "Singapore", en: "Singapore" },
    PH: { vi: "Philippines", en: "Philippines" },
    IN: { vi: "Ấn Độ", en: "India" },
    GB: { vi: "Anh", en: "United Kingdom" },
    FR: { vi: "Pháp", en: "France" },
    DE: { vi: "Đức", en: "Germany" },
    AU: { vi: "Úc", en: "Australia" },
    BR: { vi: "Brazil", en: "Brazil" },
    CA: { vi: "Canada", en: "Canada" },
    RU: { vi: "Nga", en: "Russia" },
    OTHER: { vi: "Khác", en: "Other" },
  };

  function detectCountryCode() {
    try {
      const lang = (typeof currentLang !== "undefined" && currentLang) ||
        (navigator.language || "vi").slice(0, 2);
      const map = { vi: "VN", ko: "KR", ja: "JP", zh: "CN", th: "TH", id: "ID", ms: "MY", en: "US", fr: "FR", de: "DE", es: "ES", pt: "BR", ru: "RU" };
      if (map[lang]) return map[lang];
    } catch (e) {}
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
      if (tz.indexOf("Ho_Chi_Minh") >= 0 || tz.indexOf("Saigon") >= 0) return "VN";
      if (tz.indexOf("Tokyo") >= 0) return "JP";
      if (tz.indexOf("Seoul") >= 0) return "KR";
      if (tz.indexOf("Shanghai") >= 0 || tz.indexOf("Hong_Kong") >= 0) return "CN";
      if (tz.indexOf("Bangkok") >= 0) return "TH";
      if (tz.indexOf("Jakarta") >= 0) return "ID";
      if (tz.indexOf("Singapore") >= 0) return "SG";
      if (tz.indexOf("New_York") >= 0 || tz.indexOf("Los_Angeles") >= 0) return "US";
      if (tz.indexOf("London") >= 0) return "GB";
      if (tz.indexOf("Paris") >= 0) return "FR";
      if (tz.indexOf("Berlin") >= 0) return "DE";
      if (tz.indexOf("Sydney") >= 0) return "AU";
    } catch (e) {}
    return "VN";
  }

  function loadRegion() {
    try {
      const raw = JSON.parse(
        (typeof safeGet === "function" ? safeGet(KEY) : null) ||
          localStorage.getItem(KEY) ||
          "{}"
      );
      if (raw && raw.country) {
        return {
          country: String(raw.country).toUpperCase().slice(0, 8),
          continent: raw.continent || continentForCountry(raw.country),
        };
      }
    } catch (e) {}
    const country = detectCountryCode();
    const region = { country, continent: continentForCountry(country) };
    saveRegion(region);
    return region;
  }

  function saveRegion(region) {
    try {
      const payload = JSON.stringify({
        country: region.country,
        continent: region.continent || continentForCountry(region.country),
      });
      if (typeof safeSet === "function") safeSet(KEY, payload);
      else localStorage.setItem(KEY, payload);
    } catch (e) {}
  }

  function continentForCountry(cc) {
    return CONTINENT_BY_CC[String(cc || "").toUpperCase()] || "AS";
  }

  function setPlayerCountry(cc) {
    const country = String(cc || "OTHER").toUpperCase().slice(0, 8);
    const region = { country, continent: continentForCountry(country) };
    saveRegion(region);
    try {
      if (typeof syncPlayerRegionOnline === "function") syncPlayerRegionOnline();
    } catch (e) {}
    return region;
  }

  function getPlayerRegion() {
    return loadRegion();
  }

  function labelCountry(cc, lang) {
    lang = lang || (typeof currentLang !== "undefined" ? currentLang : "vi");
    const o = COUNTRY_LABEL[cc] || COUNTRY_LABEL.OTHER;
    return (o && (o[lang] || o.en || o.vi)) || cc;
  }

  function labelContinent(cont, lang) {
    lang = lang || (typeof currentLang !== "undefined" ? currentLang : "vi");
    const o = CONTINENT_LABEL[cont] || CONTINENT_LABEL.WW;
    return (o && (o[lang] || o.en || o.vi)) || cont;
  }

  function countryOptions() {
    return Object.keys(COUNTRY_LABEL).map(function (cc) {
      return { code: cc, label: labelCountry(cc) };
    });
  }

  g.getPlayerRegion = getPlayerRegion;
  g.setPlayerCountry = setPlayerCountry;
  g.continentForCountry = continentForCountry;
  g.labelCountry = labelCountry;
  g.labelContinent = labelContinent;
  g.countryOptions = countryOptions;
  g.CONTINENT_LABEL = CONTINENT_LABEL;
})(typeof window !== "undefined" ? window : this);
