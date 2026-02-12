// content.js
console.log("TrustNet AI content script loaded");

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "scanPage") {

        const pageText = document.body.innerText.toLowerCase();
        const currentURL = window.location.href;

        // STEP 1A: Detect page type
        const pageType = detectPageType(currentURL, pageText);

        // STEP 1B: Analyze URL risk
        const urlRisk = analyzeURL(currentURL);

        // STEP 1C: Analyze basic page content
        const contentSignals = analyzePageContent(pageText);

        // STEP 1D: Calculate basic risk score
        const riskResult = calculateRisk(urlRisk, contentSignals, pageType);
        const paymentRisk = analyzePaymentRisk(pageText, currentURL);

        showWarningBanner(riskResult, paymentRisk);
        // Send results back to popup
        sendResponse({
            pageType,
            urlRisk,
            contentSignals,
            paymentRisk,
            riskResult
        });
    }
    // IMPORTANT: Keep message channel open
    return true;
});


// -------------------- FUNCTIONS --------------------

function detectPageType(url, text) {
    if (
        url.includes("checkout") ||
        url.includes("cart") ||
        text.includes("checkout")
    ) {
        return "Checkout Page";
    }

    if (
        text.includes("upi") ||
        text.includes("scan qr") ||
        text.includes("payment") ||
        text.includes("pay now")
    ) {
        return "Payment Page";
    }

    return "Browsing Page";
}

function analyzeURL(url) {
    const domain = url.replace("https://", "")
        .replace("http://", "")
        .split("/")[0];

    let riskPoints = 0;
    let reasons = [];

    if (domain.length > 25) {
        riskPoints += 15;
        reasons.push("Unusually long domain name");
    }

    if ((domain.match(/-/g) || []).length >= 3) {
        riskPoints += 15;
        reasons.push("Multiple hyphens in domain");
    }

    const suspiciousWords = ["sale", "offer", "free", "win"];
    suspiciousWords.forEach(word => {
        if (domain.includes(word)) {
            riskPoints += 10;
            reasons.push(`Suspicious keyword in domain: ${word}`);
        }
    });

    if (!url.startsWith("https://")) {
        riskPoints += 20;
        reasons.push("Website is not secure (HTTPS missing)");
    }

    let level = "Low";
    if (riskPoints >= 30) level = "Medium";
    if (riskPoints >= 50) level = "High";

    return {
        level,
        riskPoints,
        reasons
    };
}

function analyzePageContent(text) {
    return {
        hasReturnPolicy: text.includes("return") || text.includes("refund"),
        hasContactInfo: text.includes("contact") || text.includes("email") || text.includes("phone"),
        hasAboutUs: text.includes("about us"),
        hasShippingInfo: text.includes("shipping"),
        urgencyLanguage: (
            text.includes("limited") ||
            text.includes("hurry") ||
            text.includes("only today") ||
            text.includes("last chance")
        )
    };
}

function calculateRisk(urlRisk, contentSignals, pageType) {
    let score = urlRisk.riskPoints;
    let reasons = [...urlRisk.reasons];

    if (!contentSignals.hasReturnPolicy) {
        score += 15;
        reasons.push("No return or refund policy found");
    }

    if (!contentSignals.hasContactInfo) {
        score += 15;
        reasons.push("No contact information found");
    }

    if (contentSignals.urgencyLanguage) {
        score += 10;
        reasons.push("Urgency-based sales language detected");
    }

    if (pageType === "Payment Page") {
        score += 10;
        reasons.push("User is on a payment page");
    }

    let level = "Low";
    if (score >= 40) level = "Medium";
    if (score >= 70) level = "High";

    return {
        probability: Math.min(score, 100),
        level,
        reasons
    };
}
function analyzePaymentRisk(text, url) {
    let score = 0;
    let reasons = [];
    let detectedUPI = null;

    // Detect UPI ID pattern
    const upiRegex = /[a-zA-Z0-9.\-_]{2,}@[a-zA-Z]{2,}/;
    const upiMatch = text.match(upiRegex);

    if (upiMatch) {
        detectedUPI = upiMatch[0];
        score += 25;
        reasons.push("UPI ID detected on page");
    }

    // Detect prepaid-only language
    const prepaidKeywords = [
        "only prepaid",
        "no cod",
        "advance payment",
        "pay before delivery"
    ];

    prepaidKeywords.forEach(word => {
        if (text.includes(word)) {
            score += 20;
            reasons.push("Prepaid-only payment enforced");
        }
    });

    // Brand vs UPI mismatch (simple heuristic)
    if (detectedUPI) {
        const domain = url.replace("https://", "")
            .replace("http://", "")
            .split("/")[0]
            .split(".")[0];

        if (!detectedUPI.toLowerCase().includes(domain.toLowerCase())) {
            score += 15;
            reasons.push("Payment receiver name does not match website domain");
        }
    }

    let level = "Low";
    if (score >= 30) level = "Medium";
    if (score >= 60) level = "High";

    return {
        level,
        detectedUPI,
        reasons
    };
}
function showWarningBanner(riskResult, paymentRisk) {
    // Show banner only for high risk
    if (riskResult.level !== "High" && paymentRisk.level !== "High") return;

    // Avoid duplicate banner
    if (document.getElementById("trustnet-warning-banner")) return;

    const banner = document.createElement("div");
    banner.id = "trustnet-warning-banner";
    banner.innerHTML = `
        <div style="
            background-color: #ff4d4d;
            color: white;
            padding: 12px;
            font-family: Arial, sans-serif;
            font-size: 14px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            z-index: 999999;
        ">
            <div>
                ⚠️ <strong>High Scam Risk Detected</strong><br>
                Please verify seller before making payment.
            </div>
            <button id="trustnet-close-banner" style="
                background: white;
                color: #ff4d4d;
                border: none;
                padding: 6px 10px;
                cursor: pointer;
                font-weight: bold;
            ">
                Dismiss
            </button>
        </div>
    `;

    document.body.prepend(banner);

    document.getElementById("trustnet-close-banner").onclick = () => {
        banner.remove();
    };
}

