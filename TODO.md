# TrustNet ML Integration TODO  
## Approved Plan Steps (Updated after each completion)

### 1. ✅ Create ml-utils.js [COMPLETED]
- Phishing score from URL features (NumDots, UrlLength, etc.)
- Sentiment score (VADER-inspired keyword polarity)

### 2. ✅ Update manifest.json [COMPLETED]
- Added ml-utils.js to content_scripts  
- Updated version 2.1, description, web_accessible_resources
- Injected advanced-analysis.js

### 3. ✅ Update utils.js [COMPLETED]
- Added URLFeatureUtils for phishing features (NumDots, IPAddress, etc.)

### 4. ✅ Update content.js [COMPLETED]
- Added MLUtils.phishingScore() → urlRisk.phishingScore
- Added MLUtils.sentimentScore(pageText) → signals.sentiment
- Weighted riskScore: +20% phishing if >60, +15% negative sentiment

### 5. ✅ Update popup.js [COMPLETED]
- Added phishing score badge & sentiment display
- Enhanced chat analysis with AI sentiment (negative = +25 risk points)

### 6. ✅ Update background.js [COMPLETED]
- Added recordMLStats() for phishing/sentiment tracking
- Updated recordPageNavigation to pass ML scores

### 7. Test & Polish
- Test popup scan on ecom/phishing sites
- Verify chat sentiment on WhatsApp sample  
- Update README.md
- Reload extension & demo

**Next Step: 7/7 - Test, README, & Complete!**

