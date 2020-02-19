const chartSize = { width: 1200, height: 700 };
const margin = { left: 100, right: 10, top: 20, bottom: 150 };

const width = chartSize.width - margin.left - margin.right;
const height = chartSize.height - margin.top - margin.bottom;

const initChart = () => {
  const container = d3.select("#chart-area svg");
  const svg = container
    .attr("width", chartSize.width)
    .attr("height", chartSize.height);

  const prices = svg
    .append("g")
    .attr("class", "prices")
    .attr("transform", `translate(${margin.left}, ${margin.top})`);

  prices
    .append("text")
    .text("Time")
    .attr("class", "x axis-label")
    .attr("x", width / 2)
    .attr("y", height + 140);

  prices
    .append("text")
    .attr("class", "y axis-label")
    .attr("transform", "rotate(-90)")
    .attr("x", -height / 2)
    .attr("y", -60)
    .text("Closed Price");

  prices.append("g").attr("class", "y-axis");

  prices
    .append("g")
    .attr("class", "x-axis")
    .attr("transform", `translate(0, ${height})`);

  prices.selectAll(".x-axis text");
};

const getQuotesBetween = (quotes, { begin, end }) =>
  quotes.filter(q => {
    const date = new Date(q.Date).getTime();
    return date >= begin && date <= end;
  });

const updateQuotes = function(quotes) {
  const fq = _.first(quotes);
  const lq = _.last(quotes);
  const quotesWithSMA = quotes.filter(q => q.SMA);
  
  const minClose = _.get(_.minBy(quotes, "Close"), "Close", 0);
  const minSma = _.get(_.minBy(quotesWithSMA, "SMA"), "SMA", 0);
  const maxClose = _.get(_.maxBy(quotes, "Close"), "Close", 0);

  const quotesG = d3.select("#chart-area svg .prices");

  const y = d3
    .scaleLinear()
    .domain([Math.min(minClose, minSma), maxClose])
    .range([height, 0]);

  const yAxis = d3.axisLeft(y).ticks(10);

  quotesG.select(".y-axis").call(yAxis);

  const x = d3
    .scaleTime()
    .range([0, width])
    .domain([new Date(fq.Date), new Date(lq.Date)]);

  const xAxis = d3.axisBottom(x);
  quotesG.select(".x-axis").call(xAxis);

  const line = d3
    .line()
    .x(q => x(q.Time))
    .y(q => y(q.Close));

  quotesG
    .append("path")
    .attr("class", "close")
    .attr("d", line(quotes));

  const averageLine = d3
    .line()
    .x(q => x(q.Time))
    .y(q => y(q.SMA));

  quotesG
    .append("path")
    .attr("class", "sma")
    .attr("d", averageLine(quotesWithSMA));
};

const parseNSEI = function({ Date, Volume, AdjClose, ...numeric }) {
  _.forEach(numeric, (v, k) => (numeric[k] = +v));
  const Time = new globalThis.Date(Date);
  return { Date, Time, ...numeric };
};

const recordTransactions = quotes => {
  const buyTransactions = quotes.filter(q => q.SMA < q.Close);
  const sellTransactions = quotes.filter(q => q.Close < q.SMA);
};

const analyseData = quotes => {
  for (let i = 99; i < quotes.length; i++) {
    const firstIndex = i - 99;
    const lastHundredQuotes = quotes.slice(firstIndex, i + 1);
    const sum = lastHundredQuotes.reduce((s, quote) => s + quote.Close, 0);
    quotes[i]["SMA"] = Math.round(sum / 100);
  }
};

const initSlider = quotes => {
  const minRange = new Date(_.first(quotes).Date).getTime();
  const maxRange = new Date(_.last(quotes).Date).getTime();
  const slider = createD3RangeSlider(minRange, maxRange, "#slider-container");

  slider.onChange(newRange => {
    d3.selectAll("path").remove();
    const begin = new Date(newRange.begin).toLocaleString().split(",")[0];
    const end = new Date(newRange.end).toLocaleString().split(",")[0];
    d3.select("#range-label").text(begin + " - " + end);
    updateQuotes(getQuotesBetween(quotes, newRange));
  });
  slider.range(minRange, maxRange);
};

const visualizeQuotes = quotes => {
  analyseData(quotes);
  recordTransactions(quotes);
  initChart(quotes);
  updateQuotes(quotes);
  initSlider(quotes);
};

const main = () => {
  d3.csv("data/nsei.csv", parseNSEI).then(visualizeQuotes);
};

window.onload = main;
