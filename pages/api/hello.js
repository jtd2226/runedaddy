import Request from 'network/cache';

const ge = Request.path('https://prices.runescape.wiki/api/v1/osrs').headers({
  'User-Agent': 'rune_daddy - @neji751',
});

const price = ge.path('latest');
const hour = ge.path('1h');
const item = ge.path('mapping');

const transforms = {
  m: text => text.substring(0, text.length - 1) * 1000000,
  k: text => text.substring(0, text.length - 1) * 1000,
};

function parse(text) {
  const last = text?.toLowerCase?.()?.[text.length - 1];
  if (!transforms[last]) return text;
  return text.substring(0, text.length - 1) * transforms[last];
}

export default async function handler(req, res) {
  let { max = Infinity } = req.query;

  max = parse(max);

  const [{ data: items }, { data: prices }, { data: hourly }] =
    await Promise.all([
      item.send().then(data => ({ data })),
      price.send(),
      hour.send(),
    ]);

  const data = items
    .filter(({ id }) => prices[id])
    .map(item => {
      if (hourly[item.id]) {
        Object.assign(item, hourly[item.id]);
      }
      Object.assign(item, prices[item.id]);
      const {
        high,
        low,
        highTime,
        lowTime,
        lowPriceVolume = 0,
        highPriceVolume = 0,
      } = item;
      const margin = Math.abs(high - low);
      const profit =
        Math.min(item.limit ?? Infinity, Math.floor(max / low)) * margin;
      const volume = lowPriceVolume + highPriceVolume;
      item.margin = margin;
      item.profit = profit;
      item.volume = volume;
      item.prices = {
        high,
        low,
        margin,
        profit,
        highTime: highTime * 1000,
        lowTime: lowTime * 1000,
      };
      return item;
    })
    .filter(({ prices }) => prices.low < max)
    .sort((a, b) => b.prices.margin - a.prices.margin);
  return res.status(200).json(data);
}
