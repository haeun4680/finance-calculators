const yahooFinance = require('yahoo-finance2').default;

async function testSearch(query) {
    try {
        console.log(`Searching for: ${query}`);
        const result = await yahooFinance.search(query);
        console.log("Raw Result Quotes:", JSON.stringify(result.quotes, null, 2));

        const koreanMatch = result.quotes.find(item => item.symbol.endsWith('.KS') || item.symbol.endsWith('.KQ'));
        const bestMatch = koreanMatch || result.quotes[0];

        console.log("Selected Match:", bestMatch);
    } catch (e) {
        console.error("Error:", e);
    }
}

testSearch("현대차");
testSearch("Samsung");
testSearch("005380");
