import yahooFinance from 'yahoo-finance2';

export default async function handler(request, response) {
    const { mode, q, symbol } = request.query;

    // Set Cache Control for Vercel (Cache for 60 seconds)
    response.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate');

    // Hardcoded map for popular Korean stocks to bypass Search API failures or ambiguity
    const POPULAR_KOREAN_STOCKS = {
        "삼성전자": "005930.KS",
        "삼전": "005930.KS",
        "samsung": "005930.KS",
        "삼성전자우": "005935.KS",
        "현대차": "005380.KS",
        "현대자동차": "005380.KS",
        "hyundai": "005380.KS",
        "sk하이닉스": "000660.KS",
        "하이닉스": "000660.KS",
        "hynix": "000660.KS",
        "카카오": "035720.KS",
        "kakao": "035720.KS",
        "네이버": "035420.KS",
        "naver": "035420.KS",
        "posco": "005490.KS",
        "포스코": "005490.KS",
        "posco홀딩스": "005490.KS",
        "kb금융": "105560.KS",
        "신한지주": "055550.KS",
        "하나금융지주": "086790.KS",
        "우리금융지주": "316140.KS",
        "기아": "000270.KS",
        "lg에너지솔루션": "373220.KS",
        "macquarie": "088980.KS",
        "맥쿼리인프라": "088980.KS"
    };

    try {
        // 1. SEARCH MODE
        if (mode === 'search') {
            if (!q) throw new Error('Query is required');

            // Quick lookup in hardcoded map
            const cleanQuery = q.toLowerCase().replace(/\s+/g, '');
            if (POPULAR_KOREAN_STOCKS[cleanQuery]) {
                const symbol = POPULAR_KOREAN_STOCKS[cleanQuery];
                return response.status(200).json({ symbol: symbol, name: q }); // Return mapped symbol immediately
            }

            // Yahoo Finance Search
            const result = await yahooFinance.search(q);
            const quotes = result.quotes || [];

            if (quotes.length === 0) {
                return response.status(404).json({ error: 'Not found' });
            }

            // Prioritize Korean listings if the query looks Korean or is a 6-digit code
            // But user typically searches "Samsung" which returns many.
            // Filter for .KS (KOSPI) or .KQ (KOSDAQ)
            const koreanMatch = quotes.find(item => item.symbol.endsWith('.KS') || item.symbol.endsWith('.KQ'));
            const bestMatch = koreanMatch || quotes[0];

            return response.status(200).json({
                symbol: bestMatch.symbol,
                name: bestMatch.shortname || bestMatch.longname || bestMatch.symbol
            });
        }

        // 2. QUOTE MODE
        if (mode === 'quote') {
            if (!symbol) throw new Error('Symbol is required');

            const quote = await yahooFinance.quoteSummary(symbol, { modules: ['price', 'summaryDetail', 'defaultKeyStatistics'] });

            const priceVal = quote.price?.regularMarketPrice;
            const currency = quote.price?.currency || 'KRW';
            const name = quote.price?.shortName || quote.price?.longName || symbol;

            // Dividend Data
            // trailingAnnualDividendRate is practically DPS for TTM
            // dividendRate is the indicated annual dividend rate
            let dps = quote.summaryDetail?.dividendRate || quote.summaryDetail?.trailingAnnualDividendRate || 0;

            // Dividend Yield
            let yieldPercent = (quote.summaryDetail?.dividendYield || quote.summaryDetail?.trailingAnnualDividendYield || 0) * 100;

            // Fallback: Calculate Yield if DPS exists but Yield is 0
            if (yieldPercent === 0 && dps > 0 && priceVal > 0) {
                yieldPercent = (dps / priceVal) * 100;
            }

            return response.status(200).json({
                price: priceVal,
                yield: yieldPercent,
                dps: dps,
                name: name,
                currency: currency,
                symbol: symbol
            });
        }

        return response.status(400).json({ error: 'Invalid mode' });

    } catch (error) {
        console.error(error);
        return response.status(500).json({ error: error.message });
    }
}
