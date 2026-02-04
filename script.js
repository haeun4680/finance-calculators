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
 * Salary Calculator Logic
 */
function initSalaryCalculator() {
    const calcBtn = document.getElementById('calcSalaryBtn');
    if (!calcBtn) return;

    calcBtn.addEventListener('click', () => {
        const annualSalary = parseInputValue('salary') * 10000; // Manwon -> Won
        const nonTaxable = parseInputValue('nonTaxable') * 10000; // Manwon -> Won
        // Dependents logic could be more complex but we will use simplified deduction
        // For simplicity in this version, we'll stick to percentage-based generic calc + simplified tax bracket logic
        // This is an estimation.

        if (annualSalary <= 0) {
            alert("연봉을 입력해주세요.");
            return;
        }

        const monthlyGross = annualSalary / 12;
        const monthlyTaxable = monthlyGross - nonTaxable;

        // 2026 Tax & Insurance Rates
        // 1. National Pension (Total 9.5%, Employee 4.75%)
        // Cap base monthly income: 6,370,000 KRW (from July 2025)
        const npBase = Math.min(monthlyGross, 6370000);
        const nationalPension = Math.floor(npBase * 0.0475);

        // 2. Health Insurance (Total 7.19%, Employee 3.595%)
        const healthInsurance = Math.floor(monthlyTaxable * 0.03595);

        // 3. Long-term Care Insurance (13.14% of Health Insurance)
        const careInsurance = Math.floor(healthInsurance * 0.1314);

        // 4. Employment Insurance (0.9%)
        const employmentInsurance = Math.floor(monthlyTaxable * 0.009);

        // 5. Income Tax (Simplified logic based on taxable income brackets - 2026 estimate)
        // Using progressive rate calculation for better accuracy
        let incomeTax = 0;
        const annualizedTaxable = monthlyTaxable * 12;

        // 2026 Tax Brackets (Standard Income Tax)
        // ~ 14m: 6%
        // ~ 50m: 15%
        // ~ 88m: 24%
        // ~ 150m: 35%
        // ~ 300m: 38%
        // ~ 500m: 40%
        // ~ 1000m: 42%
        // 1000m+: 45%

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

        const annualTax = calculateAnnualTax(annualizedTaxable);

        // Adjust for dependents (Simplified tax credit for demo - e.g. 150k per person)
        const dependents = parseInputValue('dependents');
        const children = parseInputValue('childrenUnder20');
        const taxCredit = (dependents - 1) * 150000 + children * 150000; // Basic annual credit simulation

        let finalAnnualTax = Math.max(0, annualTax - taxCredit);

        // Monthly withholding usually applies Simplfied Tax Table (Ganyiseaek)
        // We approximate it as Annual Tax / 12 for this calculator
        incomeTax = Math.floor(finalAnnualTax / 12);

        // Round to 10 won
        incomeTax = Math.floor(incomeTax / 10) * 10;

        // 6. Local Income Tax (10% of Income Tax)
        const localIncomeTax = Math.floor(incomeTax * 0.1);

        const totalDeduction = nationalPension + healthInsurance + careInsurance + employmentInsurance + incomeTax + localIncomeTax;
        const monthlyNet = monthlyGross - totalDeduction;

        // Update UI
        document.getElementById('monthlyNetPay').textContent = formatMoney(monthlyNet);
        document.getElementById('monthlyGrossPay').textContent = formatMoney(monthlyGross);
        document.getElementById('totalDeduction').textContent = formatMoney(totalDeduction);
        document.getElementById('nationalPension').textContent = formatMoney(nationalPension);
        document.getElementById('healthInsurance').textContent = formatMoney(healthInsurance); // 3.595%
        document.getElementById('careInsurance').textContent = formatMoney(careInsurance); // 13.14% of Health
        document.getElementById('employmentInsurance').textContent = formatMoney(employmentInsurance);
        document.getElementById('incomeTax').textContent = formatMoney(incomeTax);
        document.getElementById('localIncomeTax').textContent = formatMoney(localIncomeTax);

        document.getElementById('resultArea').classList.add('show');
    });
}

// Initializers
document.addEventListener('DOMContentLoaded', () => {
    initSalaryCalculator();
    initRentCalculator();
    initLoanCalculator();
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

        // Formula: M = P * [ r(1+r)^n ] / [ (1+r)^n – 1 ]
        // P: Principal, r: Monthly Interest Rate, n: Months

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
                // Jeonse -> Wolse (Lower Deposit, Higher Rent)
                // "How much deposit to convert to rent?"
                currentRentGroup.style.display = 'none'; // Usually purely Jeonse start, or existing Wolse
                // Actually to support "Wolse -> More Wolse" is rare. Usually Jeonse -> Wolse.
                // Or "Lower Deposit"
                currentRentGroup.style.display = 'block'; // Let's allow starting with some rent
                targetLabel.textContent = "줄이고 싶은 보증금 액수 (만원)";
                targetHelp.textContent = "현재 보증금에서 이 금액만큼을 빼고 월세로 전환합니다.";
            } else {
                // Wolse -> Jeonse (Higher Deposit, Lower Rent)
                // "How much rent to save?" -> Amount of Rent (Won) to convert to Deposit?
                // Or "Increase Deposit by?"
                // Let's go with "Reduce Rent by amount"
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
            // REDUCING Deposit -> INCREASING Rent
            // value to reduce from deposit
            const reduceDeposit = targetAmount;

            if (reduceDeposit > currentDeposit) {
                alert("줄이려는 보증금이 현재 보증금보다 클 수 없습니다.");
                return;
            }

            // Formula: Monthly Rent = Deposit * Rate / 12
            additionalRent = Math.floor((reduceDeposit * rate) / 12);

            finalDeposit = currentDeposit - reduceDeposit;
            finalRent = currentRent + additionalRent;

            resultLabel.textContent = "추가되는 월세";
            resultValue.textContent = formatMoney(additionalRent);
            finalDepositResult.textContent = formatMoney(finalDeposit);
            finalRentValue.textContent = formatMoney(finalRent);

        } else {
            // REDUCING Rent -> INCREASING Deposit
            // value to reduce from rent
            const reduceRent = targetAmount; // In Won (input was Manwon * 10000)

            if (reduceRent > currentRent) {
                alert("줄이려는 월세가 현재 월세보다 클 수 없습니다.");
                return;
            }

            // Formula: Deposit = (Monthly Rent * 12) / Rate
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
