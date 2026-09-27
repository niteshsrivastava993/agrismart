// Turns a spoken sentence into a market search or a page to open. English only for now.
const STATES = ['andhra pradesh', 'arunachal pradesh', 'assam', 'bihar', 'chhattisgarh', 'goa', 'gujarat', 'haryana', 'himachal pradesh', 'jharkhand', 'karnataka', 'kerala', 'madhya pradesh', 'maharashtra', 'manipur', 'meghalaya', 'mizoram', 'nagaland', 'odisha', 'punjab', 'rajasthan', 'sikkim', 'tamil nadu', 'telangana', 'tripura', 'uttar pradesh', 'uttarakhand', 'west bengal', 'delhi', 'jammu and kashmir', 'ladakh', 'chandigarh', 'puducherry'];
const title = (s) => s.replace(/\b\w/g, (c) => c.toUpperCase());

const NAV = [
  [/\bcrop health\b|\bhealth\b/, '/farmer/crop-health'],
  [/\bdiary\b/, '/farmer/diary'],
  [/\bweather\b/, '/farmer/weather'],
  [/\bmap\b/, '/farmer/farm-map'],
  [/\bfields?\b/, '/farmer/fields'],
  [/\b(notifications?|alerts?)\b/, '/notifications'],
  [/\b(sell|listings?)\b/, '/farmer/listings'],
  [/\b(marketplace|browse)\b/, '/buyer/dashboard'],
  [/\b(market|mandi)\b/, '/market'],
  [/\b(dashboard|home)\b/, '/'],
];

export function parseVoiceQuery(text) {
  const t = String(text || '').toLowerCase().replace(/[.,!?]/g, '').trim();
  if (!t) return null;

  const lead = "(?:(?:show|get|find|check|tell|what(?:'s| is| are))\\s+(?:me\\s+)?)?(?:the\\s+)?(?:current\\s+|today's\\s+)?";
  const m = t.match(new RegExp(`^${lead}(.+?)\\s+(?:prices?|rates?)(?:\\s+(?:in|at|for)\\s+(.+))?$`))
    || t.match(/(?:prices?|rates?)\s+(?:of|for)\s+(.+?)(?:\s+(?:in|at)\s+(.+))?$/);
  if (m && m[1]) {
    const params = { commodity: title(m[1].trim()) };
    if (m[2]) params[STATES.includes(m[2].trim()) ? 'state' : 'district'] = title(m[2].trim());
    return { type: 'market', params };
  }

  const nav = t.match(/^(?:go to|open|show|take me to|navigate to)\s+(?:the\s+|my\s+)?(.+)$/);
  if (nav) {
    for (const [rx, to] of NAV) if (rx.test(nav[1])) return { type: 'navigate', to };
  }
  return null;
}
