/**
 * Utility function to format numbers as Korean currency string (e.g. 3,000,000)
 */
function formatMoney(amount) {
    return Math.floor(amount).toLocaleString('ko-KR') + '원';
}

/**
 * Utility to parse input value as number
 */
function parseInputValue(id) {
    const el = document.getElementById(id);
    if (!el || el.value.trim() === '') return 0;
    const val = parseFloat(el.value);
    return isNaN(val) ? 0 : val;
}

/**
 * Salary Calculator Logic (2026 Update with Reverse Calc)
 */
function initSalaryCalculator() {
    const calcBtn = document.getElementById('calcSalaryBtn');
    if (!calcBtn) return;

    // Toggle Logic
    let currentPeriod = 'annual'; // annual | monthly
    let currentTax = 'pre';       // pre | post

    const periodOptions = document.querySelectorAll('#periodToggle .toggle-option');
    const taxOptions = document.querySelectorAll('#taxToggle .toggle-option');
    const salaryLabel = document.getElementById('salaryLabel');
    const salaryHelp = document.getElementById('salaryHelp');

    function updateLabel() {
        let text = "";
        if (currentPeriod === 'annual') {
            text = (currentTax === 'pre') ? "연봉 (세전, 만원)" : "연봉 (세후 실수령, 만원)";
        } else {
            text = (currentTax === 'pre') ? "월급 (세전, 만원)" : "월급 (세후 실수령, 만원)";
        }
        salaryLabel.textContent = text;

        if (currentTax === 'post') {
            salaryHelp.style.display = 'block';
        } else {
            salaryHelp.style.display = 'none';
        }
    }

    periodOptions.forEach(opt => {
        opt.addEventListener('click', () => {
            periodOptions.forEach(o => o.classList.remove('active'));
            opt.classList.add('active');
            currentPeriod = opt.dataset.value;
            updateLabel();
        });
    });

    taxOptions.forEach(opt => {
        opt.addEventListener('click', () => {
            taxOptions.forEach(o => o.classList.remove('active'));
            opt.classList.add('active');
            currentTax = opt.dataset.value;
            updateLabel();
        });
    });

    updateLabel(); // Init label

    // Core Calculation Function (Pure)
    function calculateDetails(grossAnnual, nonTaxable, dependents, children) {
        const monthlyGross = grossAnnual / 12;
        const monthlyTaxable = Math.max(0, monthlyGross - nonTaxable);

        // 1. National Pension (4.5%, Cap 6.37m base)
        const npBase = Math.min(monthlyGross, 6370000); // 2025 July Cap
        const nationalPension = Math.floor(npBase * 0.045);

        // 2. Health Insurance (3.545%)
        const healthInsurance = Math.floor(monthlyTaxable * 0.03545);

        // 3. Care Insurance (12.95% of Health)
        const careInsurance = Math.floor(healthInsurance * 0.1295);

        // 4. Employment Insurance (0.9%)
        const employmentInsurance = Math.floor(monthlyTaxable * 0.009);

        // 5. Income Tax
        const annualizedTaxable = monthlyTaxable * 12;

        function calculateAnnualTax(taxable) {
            if (taxable <= 14000000) return taxable * 0.06;
            if (taxable <= 50000000) return 840000 + (taxable - 14000000) * 0.15;
            if (taxable <= 88000000) return 6240000 + (taxable - 50000000) * 0.24;
            if (taxable <= 150000000) return 15360000 + (taxable - 88000000) * 0.35;
            if (taxable <= 300000000) return 37060000 + (taxable - 150000000) * 0.38;
            if (taxable <= 500000000) return 94060000 + (taxable - 300000000) * 0.40;
            if (taxable <= 1000000000) return 174060000 + (taxable - 500000000) * 0.42;
            return 384060000 + (taxable - 1000000000) * 0.45;
        }

        const annualTaxRaw = calculateAnnualTax(annualizedTaxable);

        // Simplified Tax Credit
        const taxCredit = (dependents - 1) * 150000 + children * 150000;
        let finalAnnualTax = Math.max(0, annualTaxRaw - taxCredit);

        let incomeTax = Math.floor(finalAnnualTax / 12);
        incomeTax = Math.floor(incomeTax / 10) * 10; // Truncate last digit

        // 6. Local Tax
        const localIncomeTax = Math.floor(incomeTax * 0.1);

        const totalDeduction = nationalPension + healthInsurance + careInsurance + employmentInsurance + incomeTax + localIncomeTax;
        const monthlyNet = monthlyGross - totalDeduction;

        return {
            grossAnnual,
            monthlyGross,
            monthlyNet,
            deductions: {
                total: totalDeduction,
                national: nationalPension,
                health: healthInsurance,
                care: careInsurance,
                employment: employmentInsurance,
                income: incomeTax,
                local: localIncomeTax
            }
        };
    }

    // Reverse Calculation: Find Gross Annual from Target Monthly Net
    function findGrossFromNet(targetNetMonthly, nonTaxable, dependents, children) {
        let low = targetNetMonthly * 12; // Min gross is roughly net * 12
        let high = targetNetMonthly * 12 * 2; // Max gross estimate
        let steps = 0;
        let bestGuess = low;

        // Binary search
        while (low <= high && steps < 50) {
            const mid = Math.floor((low + high) / 2);
            const res = calculateDetails(mid, nonTaxable, dependents, children);

            if (Math.abs(res.monthlyNet - targetNetMonthly) < 100) {
                return mid; // Enough precision
            }

            if (res.monthlyNet < targetNetMonthly) {
                low = mid + 1;
            } else {
                high = mid - 1;
            }
            steps++;
            bestGuess = mid;
        }
        return bestGuess;
    }

    // State Parsing from URL
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('salary')) {
        const pSalary = urlParams.get('salary');
        const pPeriod = urlParams.get('period') || 'annual';
        const pTax = urlParams.get('tax') || 'pre';
        const pNonTax = urlParams.get('nontax') || '20';
        const pDep = urlParams.get('dep') || '1';
        const pChild = urlParams.get('child') || '0';

        document.getElementById('salaryInput').value = pSalary;
        document.getElementById('nonTaxable').value = pNonTax;
        document.getElementById('dependents').value = pDep;
        document.getElementById('childrenUnder20').value = pChild;

        // Set Toggles
        periodOptions.forEach(o => o.classList.remove('active'));
        document.querySelector(`#periodToggle .toggle-option[data-value="${pPeriod}"]`).classList.add('active');
        currentPeriod = pPeriod;

        taxOptions.forEach(o => o.classList.remove('active'));
        document.querySelector(`#taxToggle .toggle-option[data-value="${pTax}"]`).classList.add('active');
        currentTax = pTax;

        updateLabel();

        // Auto Calc
        setTimeout(() => calcBtn.click(), 100);
    }

    // Share Functions
    function generateShareUrl() {
        const salary = document.getElementById('salaryInput').value;
        const nonTax = document.getElementById('nonTaxable').value;
        const dep = document.getElementById('dependents').value;
        const child = document.getElementById('childrenUnder20').value;

        const params = new URLSearchParams();
        params.set('salary', salary);
        params.set('period', currentPeriod);
        params.set('tax', currentTax);
        params.set('nontax', nonTax);
        params.set('dep', dep);
        params.set('child', child);

        return `${window.location.origin}${window.location.pathname}?${params.toString()}`;
    }

    const shareKakaoBtn = document.getElementById('shareKakaoBtn');
    if (shareKakaoBtn) {
        shareKakaoBtn.addEventListener('click', async () => {
            const shareUrl = generateShareUrl();
            const netPay = document.getElementById('monthlyNetPay').textContent;

            if (navigator.share) {
                try {
                    await navigator.share({
                        title: '2026 연봉 실수령액 계산기',
                        text: `내 월 예상 실수령액은 ${netPay}입니다! 💸`,
                        url: shareUrl
                    });
                } catch (err) {
                    console.log('Share canceled');
                }
            } else {
                // Fallback
                prompt("이 링크를 복사해서 공유하세요!", shareUrl);
            }
        });
    }

    const copyLinkBtn = document.getElementById('copyLinkBtn');
    if (copyLinkBtn) {
        copyLinkBtn.addEventListener('click', () => {
            const shareUrl = generateShareUrl();
            navigator.clipboard.writeText(shareUrl).then(() => {
                alert("링크가 복사되었습니다! 📋");
            });
        });
    }

    const showQrBtn = document.getElementById('showQrBtn');
    if (showQrBtn) {
        showQrBtn.addEventListener('click', () => {
            const shareUrl = generateShareUrl();
            const qrContainer = document.getElementById('qrCodeContainer');
            qrContainer.innerHTML = ""; // Clear prev
            new QRCode(qrContainer, {
                text: shareUrl,
                width: 180,
                height: 180
            });
            const modal = document.getElementById('qrModal');
            modal.style.display = 'flex';

            // Close on outside click
            modal.onclick = (event) => {
                if (event.target === modal) {
                    modal.style.display = "none";
                }
            };
        });
    }

    // ... existing calculation logic ...
    calcBtn.addEventListener('click', () => {
        // ... (Update history state)
        const inputValue = parseInputValue('salaryInput') * 10000; // Manwon -> Won

        // Update URL State without reload
        const shareUrl = generateShareUrl();
        history.replaceState(null, '', shareUrl);

        // ... rest of calculation ...
        const nonTaxable = parseInputValue('nonTaxable') * 10000;
        const dependents = parseInputValue('dependents');
        const children = parseInputValue('childrenUnder20');

        if (inputValue <= 0) {
            alert("금액을 입력해주세요.");
            return;
        }

        let grossAnnual = 0;

        // Determine Gross Annual based on Mode
        if (currentPeriod === 'annual') {
            // Annual Input
            if (currentTax === 'pre') {
                // Annual + Pre-tax: Input IS Gross Annual
                grossAnnual = inputValue;
            } else {
                // Annual + Post-tax: Reverse Calc
                // Target Net Monthly = Input / 12
                grossAnnual = findGrossFromNet(inputValue / 12, nonTaxable, dependents, children);
            }
        } else {
            // Monthly Input
            if (currentTax === 'pre') {
                // Monthly + Pre-tax: Gross Annual = Input * 12
                grossAnnual = inputValue * 12;
            } else {
                // Monthly + Post-tax: Reverse Calc
                grossAnnual = findGrossFromNet(inputValue, nonTaxable, dependents, children);
            }
        }

        // Calculate Final Details
        const res = calculateDetails(grossAnnual, nonTaxable, dependents, children);

        // Update UI
        document.getElementById('monthlyNetPay').textContent = formatMoney(res.monthlyNet);
        document.getElementById('annualGrossPay').textContent = formatMoney(res.grossAnnual);
        document.getElementById('monthlyGrossPay').textContent = formatMoney(res.monthlyGross);

        document.getElementById('totalDeduction').textContent = formatMoney(res.deductions.total);
        document.getElementById('nationalPension').textContent = formatMoney(res.deductions.national);
        document.getElementById('healthInsurance').textContent = formatMoney(res.deductions.health);
        document.getElementById('careInsurance').textContent = formatMoney(res.deductions.care);
        document.getElementById('employmentInsurance').textContent = formatMoney(res.deductions.employment);
        document.getElementById('incomeTax').textContent = formatMoney(res.deductions.income);
        document.getElementById('localIncomeTax').textContent = formatMoney(res.deductions.local);

        document.getElementById('resultArea').classList.add('show');
        document.getElementById('resultArea').scrollIntoView({ behavior: 'smooth' });
    });
}

// Initializers
document.addEventListener('DOMContentLoaded', () => {
    initSalaryCalculator();
    initRentCalculator();
    initLoanCalculator();
    initStockTaxCalculator();
});

/**
 * Loan Calculator Logic (Equal Principal and Interest)
 */
function initLoanCalculator() {
    const calcBtn = document.getElementById('calcLoanBtn');
    if (!calcBtn) return;

    calcBtn.addEventListener('click', () => {
        const principal = parseInputValue('loanAmount') * 10000;
        const rate = parseInputValue('loanRate') / 100;
        const termInput = parseInputValue('loanTerm');
        const termUnit = document.getElementById('loanTermUnit').value;

        if (principal <= 0 || termInput <= 0) {
            alert("대출 금액과 기간을 올바르게 입력해주세요.");
            return;
        }

        let months = 0;
        if (termUnit === 'year') {
            months = termInput * 12;
        } else {
            months = termInput;
        }

        const monthlyRate = rate / 12;

        let monthlyPayment = 0;
        let totalPayment = 0;
        let totalInterest = 0;

        if (rate === 0) {
            monthlyPayment = Math.floor(principal / months);
            totalPayment = principal;
            totalInterest = 0;
        } else {
            const pow = Math.pow(1 + monthlyRate, months);
            monthlyPayment = Math.floor(principal * (monthlyRate * pow) / (pow - 1));
            totalPayment = monthlyPayment * months;
            totalInterest = totalPayment - principal;
        }

        // Update UI
        document.getElementById('monthlyPayment').textContent = formatMoney(monthlyPayment);
        document.getElementById('totalInterest').textContent = formatMoney(totalInterest);
        document.getElementById('totalPayment').textContent = formatMoney(totalPayment);

        document.getElementById('loanResultArea').classList.add('show');
    });
}

/**
 * Rent Conversion Calculator Logic
 */
function initRentCalculator() {
    const calcBtn = document.getElementById('calcRentBtn');
    if (!calcBtn) return;

    // Toggle logic for radio buttons
    const radios = document.getElementsByName('conversionType');
    const currentRentGroup = document.getElementById('currentRentGroup');
    const targetLabel = document.getElementById('targetLabel');
    const targetHelp = document.getElementById('targetHelp');

    radios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            if (e.target.value === 'toRent') {
                currentRentGroup.style.display = 'none';
                currentRentGroup.style.display = 'block';
                targetLabel.textContent = "줄이고 싶은 보증금 액수 (만원)";
                targetHelp.textContent = "현재 보증금에서 이 금액만큼을 빼고 월세로 전환합니다.";
            } else {
                currentRentGroup.style.display = 'block';
                targetLabel.textContent = "줄이고 싶은 월세 액수 (만원)";
                targetHelp.textContent = "현재 월세에서 이 금액만큼을 줄이기 위해 필요한 보증금을 계산합니다.";
            }
        });
    });

    calcBtn.addEventListener('click', () => {
        const type = document.querySelector('input[name="conversionType"]:checked').value;
        const currentDeposit = parseInputValue('currentDeposit') * 10000; // Manwon -> Won
        const currentRent = parseInputValue('currentRent') * 10000;
        const targetAmount = parseInputValue('targetAmount') * 10000;
        const rate = parseInputValue('conversionRate') / 100;

        if (rate <= 0) {
            alert("전환율을 0보다 크게 입력해주세요.");
            return;
        }

        const resultArea = document.getElementById('rentResultArea');
        const resultLabel = document.getElementById('resultLabel');
        const resultValue = document.getElementById('resultValue');
        const finalDepositResult = document.getElementById('finalDepositResult');
        const finalRentResult = document.getElementById('finalRentRow');
        const finalRentValue = document.getElementById('finalRentResult');

        let additionalRent = 0;
        let additionalDeposit = 0;
        let finalDeposit = 0;
        let finalRent = 0;

        if (type === 'toRent') {
            const reduceDeposit = targetAmount;
            if (reduceDeposit > currentDeposit) {
                alert("줄이려는 보증금이 현재 보증금보다 클 수 없습니다.");
                return;
            }
            additionalRent = Math.floor((reduceDeposit * rate) / 12);
            finalDeposit = currentDeposit - reduceDeposit;
            finalRent = currentRent + additionalRent;

            resultLabel.textContent = "추가되는 월세";
            resultValue.textContent = formatMoney(additionalRent);
            finalDepositResult.textContent = formatMoney(finalDeposit);
            finalRentValue.textContent = formatMoney(finalRent);
        } else {
            const reduceRent = targetAmount;
            if (reduceRent > currentRent) {
                alert("줄이려는 월세가 현재 월세보다 클 수 없습니다.");
                return;
            }
            additionalDeposit = Math.floor((reduceRent * 12) / rate);
            finalDeposit = currentDeposit + additionalDeposit;
            finalRent = currentRent - reduceRent;

            resultLabel.textContent = "필요한 추가 보증금";
            resultValue.textContent = formatMoney(additionalDeposit);
            finalDepositResult.textContent = formatMoney(finalDeposit);
            finalRentValue.textContent = formatMoney(finalRent);
        }

        resultArea.classList.add('show');
    });
}

/**
 * Stock Tax Calculator Logic (Overseas Only)
 */
function initStockTaxCalculator() {
    const calcBtn = document.getElementById('calcTaxBtn');
    if (!calcBtn) return;

    // Force default deduction for Overseas (Fixed Mode)
    const basicDeductionInput = document.getElementById('basicDeduction');
    if (basicDeductionInput) basicDeductionInput.value = 250;

    calcBtn.addEventListener('click', () => {
        const profitWan = parseInputValue('totalProfit'); // Manwon
        const profit = profitWan * 10000;
        const deduction = parseInputValue('basicDeduction') * 10000;

        if (profitWan === 0 && document.getElementById('totalProfit').value === "") {
            alert("매매 차익을 입력해주세요.");
            return;
        }

        // Always Overseas Logic
        const taxableIncome = Math.max(0, profit - deduction);
        let tax = 0;
        let rateStr = "0%";
        let message = "";

        if (taxableIncome > 0) {
            tax = Math.floor(taxableIncome * 0.22); // 22% rate
            rateStr = "22% (양도세+지방세)";
            message = `
                <strong>이만큼 나라에 기여하시네요! 🇰🇷</strong><br>
                하지만 걱정 마세요. 세금을 낸다는 건 그만큼 <strong>수익을 많이 내셨다</strong>는 뜻이니까요!<br>
                세금을 제하고도 <strong>${formatMoney(profit - tax)}</strong>은 온전히 투자자님의 몫입니다. 💰
            `;
        } else {
            tax = 0;
            rateStr = "0% (비과세 구간)";
            message = `
                <strong>🎉 축하합니다! 세금이 0원입니다!</strong><br>
                기본 공제(250만원) 구간 이내이거나 손실 상계 처리되어 납부할 세금이 없습니다.<br>
                이 수익은 <strong>100% 투자자님의 것</strong>입니다. 맛있는 거 사드세요! 🍗
            `;
        }

        const netProfit = profit - tax;

        // UI Update
        document.getElementById('finalTax').textContent = formatMoney(tax);
        document.getElementById('grossProfit').textContent = formatMoney(profit);
        document.getElementById('netProfit').textContent = formatMoney(netProfit);
        document.getElementById('taxableIncome').textContent = formatMoney(taxableIncome);
        document.getElementById('appliedRate').textContent = rateStr;

        const msgBox = document.getElementById('funMessage');
        msgBox.innerHTML = message;
        msgBox.style.display = 'block';

        document.getElementById('resultArea').classList.add('show');
        document.getElementById('resultArea').scrollIntoView({ behavior: 'smooth' });
    });
}
