import axios from 'axios';
import * as cheerio from 'cheerio';
import iconv from 'iconv-lite';

export default async function handler(request, response) {
    const { mode, q, symbol } = request.query;

    try {
        // 1. SEARCH MODE
        if (mode === 'search') {
            if (!q) throw new Error('Query is required');

            // Naver Finance Search (using mobile site for cleaner JSON/HTML or desktop site)
            // Actually desktop searchList is reliable.
            // But we need to handle EUC-KR query encoding if we use the old search.
            // Let's use the 'ac' (autocomplete) API which is JSON and simpler.
            // https://ac.finance.naver.com/ac?q={encoded}&target=stock

            const encodeUrl = `https://ac.finance.naver.com/ac?q=${encodeURIComponent(q)}&target=stock`;

            const res = await axios.get(encodeUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                }
            });

            const data = res.data;
            // Result format: {"items": [[["005380", "현대차", ...]]]}

            if (!data.items || data.items.length === 0 || data.items[0].length === 0) {
                return response.status(404).json({ error: 'Not found' });
            }

            // Best match
            const match = data.items[0][0]; // ["005380", "현대차", "005380", "KOSPI", ...]
            const code = match[0];
            const name = match[1];

            return response.status(200).json({ symbol: code, name: name });
        }

        // 2. QUOTE MODE
        if (mode === 'quote') {
            if (!symbol) throw new Error('Symbol is required');
            // symbol is "005930" (Naver code)

            const url = `https://finance.naver.com/item/main.naver?code=${symbol}`;

            // Need responseType arraybuffer for decoding EUC-KR
            const res = await axios.get(url, {
                responseType: 'arraybuffer',
                headers: {
                    'User-Agent': 'Mozilla/5.0'
                }
            });

            const html = iconv.decode(res.data, 'EUC-KR');
            const $ = cheerio.load(html);

            // Parse Price
            const noToday = $('.no_today .blind').first().text().replace(/,/g, '');
            const price = parseFloat(noToday);

            // Parse Name
            const name = $('.wrap_company h2 a').text();

            // Parse Dividend Yield / DPS
            // Look for table with headers "배당수익률"
            // It's usually in the 'per_table' or similar. 
            // Simpler: Use the "종목분석" table data often found in `div.section.cop_analysis` but that's complex.
            // Let's grab it from the summary chart area if available, OR
            // Use Finnhub fallback logic? No, we need Naver data.

            // Try '배당수익률' in the 'lwidth' table (Investment info)
            // #_dvr ID might exist?

            // Robust generic finding:
            let yieldPercent = 0;
            let dps = 0;

            // Attempt to find dividend yield text in summary
            // Often in #tab_con1 (Corporate Analysis) -> but that's dynamic.
            // Check the "시가배당률" row in `.per_table` is not always there for all stocks.

            // Let's try to infer from last year's dividend if present in the 'financial summary' table.
            // Target: `.cop_analysis .c0` is recent dividend.

            // For simple usage, let's look for "현금배당수익률" in the finance summary table.
            // Or simpler: Just return price and name. User can input Yield manually if zero.
            // Wait, I promised automatic calculation.

            // ID: #_dvr (Dividend Yield) - Naver adds ids to some spans
            const dvrText = $('#_dvr').text(); // e.g. "2.51"
            if (dvrText) {
                yieldPercent = parseFloat(dvrText);
            }

            // If price exists, calculate DPS
            if (price && yieldPercent) {
                dps = price * (yieldPercent / 100);
            }

            if (!price) {
                return response.status(500).json({ error: 'Failed to parse price' });
            }

            return response.status(200).json({
                price,
                yield: yieldPercent || 0,
                dps: dps || 0,
                name: name || symbol,
                currency: 'KRW',
                symbol: symbol
            });
        }

        return response.status(400).json({ error: 'Invalid mode' });

    } catch (error) {
        console.error(error);
        return response.status(500).json({ error: error.message });
    }
}
