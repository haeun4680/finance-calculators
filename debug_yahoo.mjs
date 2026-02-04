import * as yf from 'yahoo-finance2';

console.log("Keys on namespace import:", Object.keys(yf));
console.log("Keys on default import:", yf.default ? Object.keys(yf.default) : "No default");

// Try to find search function
const yahooFinance = yf.default || yf;

async function run() {
    try {
        if (typeof yahooFinance.search === 'function') {
            console.log("Found search function on default/namespace.");
            const res = await yahooFinance.search("005930.KS");
            console.log("Test Search Result:", res.quotes[0].symbol);
        } else {
            console.error("Search function NOT found!");
        }
    } catch (e) {
        console.error(e);
    }
}

run();
