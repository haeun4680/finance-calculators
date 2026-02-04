import YahooFinance from 'yahoo-finance2';

console.log("Type of default export:", typeof YahooFinance);
try {
    const yf = new YahooFinance();
    console.log("Instantiated successfully.");
    if (typeof yf.search === 'function') {
        console.log("Instance has search method.");
        const res = await yf.search("AAPL");
        console.log("Search result:", res.quotes[0].symbol);
    }
} catch (e) {
    console.log("Instantiation failed:", e.message);

    // Check if it has static methods
    if (typeof YahooFinance.search === 'function') {
        console.log("Static search method found.");
        const res = await YahooFinance.search("AAPL");
        console.log("Static Search result:", res.quotes[0].symbol);
    }
}
