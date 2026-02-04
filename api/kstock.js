import yahooFinance from 'yahoo-finance2';

export default async function handler(request, response) {
    const { mode, q, symbol } = request.query;

    try {
        if (mode === 'search') {
            if (!q) throw new Error('Query (q) is required for search');

            const result = await yahooFinance.search(q);
            // Filter for Korean stocks if possible, or just return best match
            // Prioritize .KS (KOSPI) or .KQ (KOSDAQ)
            const koreanMatch = result.quotes.find(item => item.symbol.endsWith('.KS') || item.symbol.endsWith('.KQ'));
            const bestMatch = koreanMatch || result.quotes[0];

            if (!bestMatch) {
                return response.status(404).json({ error: 'Not found' });
            }

            return response.status(200).json(bestMatch);
        }

        if (mode === 'quote') {
            if (!symbol) throw new Error('Symbol is required for quote');

            const quote = await yahooFinance.quoteSummary(symbol, { modules: ['price', 'summaryDetail', 'defaultKeyStatistics'] });
            const price = quote.price?.regularMarketPrice;
            const yieldPercent = (quote.summaryDetail?.dividendYield || 0) * 100;
            const dps = quote.summaryDetail?.dividendRate || 0;
            const name = quote.price?.longName || symbol;
            const currency = quote.price?.currency || 'KRW';

            return response.status(200).json({
                price,
                yield: yieldPercent,
                dps,
                name,
                currency,
                symbol
            });
        }

        return response.status(400).json({ error: 'Invalid mode' });

    } catch (error) {
        console.error(error);
        return response.status(500).json({ error: error.message });
    }
}
