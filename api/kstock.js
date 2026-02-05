import yahooFinance from 'yahoo-finance2';

export default async function handler(request, response) {
    const { mode, q, symbol } = request.query;

    // Set Cache Control for Vercel (Cache for 60 seconds)
    response.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate');

    // Hardcoded map for popular Korean stocks to bypass Search API failures or ambiguity
    const POPULAR_KOREAN_STOCKS = {
        // Main
        "삼성전자": "005930.KS", "삼전": "005930.KS", "samsung": "005930.KS",
        "현대차": "005380.KS", "현대자동차": "005380.KS", "hyundai": "005380.KS",
        "sk하이닉스": "000660.KS", "하이닉스": "000660.KS", "hynix": "000660.KS",
        "카카오": "035720.KS", "kakao": "035720.KS",
        "네이버": "035420.KS", "naver": "035420.KS",
        "posco": "005490.KS", "포스코": "005490.KS", "posco홀딩스": "005490.KS",
        "기아": "000270.KS",
        "lg에너지솔루션": "373220.KS",
        "macquarie": "088980.KS", "맥쿼리인프라": "088980.KS",

        // Preferred Stocks (우선주) - High Dividend Yields
        "삼성전자우": "005935.KS", "삼성우": "005935.KS", "삼전우": "005935.KS",
        "현대차우": "005385.KS", "현대차2우b": "005387.KS", "현대차3우b": "005389.KS",
        "lg화학우": "051915.KS",
        "lg전자우": "066575.KS",
        "s-oil우": "010955.KS", "에쓰오일우": "010955.KS",
        "한화3우b": "00088K.KS", // Popular high dividend
        "대신증권우": "003545.KS",
        "nh투자증권우": "005945.KS"
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

            try {
                const quote = await yahooFinance.quote(symbol); // Use simpler 'quote' method

                if (!quote) throw new Error("No data returned");

                const priceVal = quote.regularMarketPrice;
                const currency = quote.currency || 'KRW';
                const name = quote.shortName || quote.longName || symbol;

                // Dividend Data: Try indicated yield first, then trailing
                let dps = quote.dividendRate || quote.trailingAnnualDividendRate || 0;
                let yieldPercent = (quote.dividendYield || quote.trailingAnnualDividendYield || 0) * 100;

                // Fallback calc
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

            } catch (apiError) {
                console.error(`Yahoo API failed for ${symbol}: ${apiError.message}`);

                // EMERGENCY FALLBACK DATA (To prevent UI failure)
                const FALLBACK_QUOTES = {
                    "005930.KS": { price: 54900, dps: 1444, yield: 2.63, name: "Samsung Electronics" }, // 삼성전자
                    "005935.KS": { price: 47950, dps: 1444, yield: 3.01, name: "Samsung Electronics Pref" }, // 삼성전자우
                    "005380.KS": { price: 228000, dps: 13000, yield: 5.70, name: "Hyundai Motor" }, // 현대차
                    "000660.KS": { price: 185000, dps: 1500, yield: 0.81, name: "SK Hynix" }, // SK하이닉스
                    "035720.KS": { price: 58000, dps: 61, yield: 0.10, name: "Kakao" }, // 카카오
                    "035420.KS": { price: 205000, dps: 0, yield: 0, name: "NAVER" }, // 네이버
                    "005490.KS": { price: 430000, dps: 10000, yield: 2.32, name: "POSCO Holdings" }, // POSCO홀딩스
                    "105560.KS": { price: 68000, dps: 3060, yield: 4.50, name: "KB Financial" },
                    "055550.KS": { price: 45000, dps: 2100, yield: 4.66, name: "Shinhan Financial" }
                };

                if (FALLBACK_QUOTES[symbol]) {
                    const fallback = FALLBACK_QUOTES[symbol];
                    return response.status(200).json({
                        price: fallback.price,
                        yield: fallback.yield,
                        dps: fallback.dps,
                        name: fallback.name,
                        currency: 'KRW',
                        symbol: symbol,
                        isFallback: true
                    });
                }

                throw apiError; // Re-throw if no fallback
            }
        }

        return response.status(400).json({ error: 'Invalid mode' });

    } catch (error) {
        console.error(error);
        return response.status(500).json({ error: error.message });
    }
}
