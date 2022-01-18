import Request from 'network/cache';

const ge = Request.path('https://prices.runescape.wiki/api/v1/osrs').headers({
  'User-Agent': 'rune_daddy - @neji751',
});

const price = ge.path('latest');

const item = ge.path('mapping');

export default async function handler(req, res) {
  const { max = Infinity } = req.query;
  const items = await item.send();
  const { data: prices } = await price.send();
  const data = items
    .filter(({ id }) => prices[id])
    .map(item => {
      const { high, low, highTime, lowTime } = prices[item.id];
      const margin = Math.abs(high - low);
      const profit =
        Math.min(item.limit ?? Infinity, Math.floor(max / low)) * margin;
      item.high = high;
      item.low = low;
      item.margin = margin;
      item.profit = profit;
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
