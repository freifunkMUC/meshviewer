import { Moment } from "moment";

export const sortByKey = function sortByKey<K extends string, T extends Record<K, Moment>>(key: K, data: T[]): T[] {
  return data.sort(function (a, b) {
    return b[key].unix() - a[key].unix();
  });
};

export const limit = function limit<K extends string, T extends Record<K, { isAfter: (p: Moment) => boolean }>>(
  key: K,
  moment: Moment,
  data: T[],
): T[] {
  return data.filter(function (entry) {
    return entry[key].isAfter(moment);
  });
};

export const sum = function sum(items: number[]) {
  return items.reduce(function (a, b) {
    return a + b;
  }, 0);
};

export const one = function one() {
  return 1;
};

export const dictGet = function dictGet(dict: object | null | undefined, keys: readonly string[]): unknown {
  if (keys.length === 0) {
    return null;
  }

  let current: unknown = dict;
  for (const key of keys) {
    if (!current || typeof current !== "object" || !(key in current)) {
      return null;
    }
    current = (current as Record<string, unknown>)[key];
  }
  return current;
};

export const collapseWhitespace = function collapseWhitespace(value: unknown) {
  if (value === null || value === undefined) {
    return "";
  }
  return String(value).replace(/\s+/g, " ").trim();
};

export const normalizeFilterValue = function normalizeFilterValue(value: unknown) {
  return collapseWhitespace(value).toLowerCase();
};

// The sort makes the most common spelling win the label, deterministically.
export const mergeSpellingVariants = function mergeSpellingVariants(counts: Map<unknown, number>) {
  const merged = new Map<string, [string, number]>();

  [...counts]
    .sort(function (a, b) {
      return b[1] - a[1] || (String(a[0]) < String(b[0]) ? -1 : 1);
    })
    .forEach(function ([value, count]) {
      const key = normalizeFilterValue(value);
      const group = merged.get(key);

      if (group === undefined) {
        merged.set(key, [collapseWhitespace(value), count]);
      } else {
        group[1] += count;
      }
    });

  return [...merged.values()];
};

export const listReplace = function listReplace(
  template: string,
  subst: ReplaceMapping,
  encode = (value: string) => value,
) {
  for (const [key, value] of Object.entries(subst)) {
    const re = new RegExp(key, "g");
    // A replacer function keeps "$&" and friends in the value literal.
    template = template.replace(re, () => encode(value));
  }
  return template;
};

export const listReplaceUrl = function listReplaceUrl(template: string, subst: ReplaceMapping) {
  return listReplace(template, subst, encodeURIComponent);
};

export const showDistance = function showDistance(data: { distance: number }) {
  if (isNaN(data.distance)) {
    return "";
  }

  return data.distance.toFixed(0) + " m";
};

export const showTq = function showTq(tq: number) {
  return (tq * 100).toFixed(0) + "%";
};

// Format throughput in kbps as an SI-prefixed bit/s string (e.g. "24 Mbit/s").
export const showThroughput = function showThroughput(kbps: number) {
  if (kbps === undefined || kbps === null || isNaN(kbps)) {
    return "";
  }
  let units = ["kbit/s", "Mbit/s", "Gbit/s", "Tbit/s"];
  let value = kbps;
  let unit = 0;
  while (value >= 1000 && unit < units.length - 1) {
    value /= 1000;
    unit++;
  }
  return (value < 10 ? value.toFixed(1) : value.toFixed(0)) + " " + units[unit];
};

// Returns a Link's link-quality metric for a given direction, normalised to a
// 0..1 scale where higher is better. Batman IV uses tq directly (TQ=0 is
// treated as no metric; call sites coalesce to 0 for colouring). Batman V
// maps throughput logarithmically over [1 Mbps, 1.2 Gbps]. Returns undefined
// when neither metric is set or non-zero.
export const linkMetric = function linkMetric(tq: number | undefined, throughput: number | undefined) {
  if (tq !== undefined && tq > 0) {
    return tq;
  }
  if (throughput !== undefined && throughput > 0) {
    let lo = Math.log10(1e3);
    let hi = Math.log10(1.2e6);
    let v = (Math.log10(throughput) - lo) / (hi - lo);
    return Math.max(0, Math.min(1, v));
  }
  return undefined;
};

// Human-readable display string for a Link direction.
export const showLinkMetric = function showLinkMetric(tq: number | undefined, throughput: number | undefined) {
  if (tq !== undefined && tq > 0) {
    return showTq(tq);
  }
  if (throughput !== undefined && throughput > 0) {
    return showThroughput(throughput);
  }
  return "";
};

// Human-readable display string for both directions of a Link, omitting the
// separator when one side has no metric (e.g. VPN gateways in Batman V).
export const showBiDiLinkMetric = function showBiDiLinkMetric(
  src_tq: number | undefined,
  src_throughput: number | undefined,
  tgt_tq: number | undefined,
  tgt_throughput: number | undefined,
) {
  const src = showLinkMetric(src_tq, src_throughput);
  const tgt = showLinkMetric(tgt_tq, tgt_throughput);
  return [src, tgt].filter(Boolean).join(" - ");
};
