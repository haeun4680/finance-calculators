import * as yfNavbar from 'yahoo-finance2';
import yfDefault from 'yahoo-finance2';

console.log("1. Namespace:", Object.keys(yfNavbar));
console.log("2. Default:", yfDefault);

async function run() {
    try {
        if (yfDefault && typeof yfDefault.search === 'function') {
            console.log("Method A: yfDefault.search works");
            await yfDefault.search("AAPL");
        }
    } catch (e) { console.log(e.message); }

    try {
        // @ts-ignore
        if (yfNavbar.default && typeof yfNavbar.default.search === 'function') {
            console.log("Method B: yfNavbar.default.search works");
        }
    } catch (e) { }

    try {
        if (typeof yfNavbar.search === 'function') {
            console.log("Method C: yfNavbar.search (named export) works");
        }
    } catch (e) { }

}
run();
