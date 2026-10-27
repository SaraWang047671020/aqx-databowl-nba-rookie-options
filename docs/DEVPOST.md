# Devpost submission — Rookie Option Lab

## Project name
Rookie Option Lab: Keep the Rookie or Cut the Loss?

## Elevator pitch (≤ 200 characters)
Forecasts a first-round pick's year-3 Win Shares, prices them against his rookie contract, and recommends whether to exercise the fourth-year team option, before the deadline.

## Links
- Live app: https://aqx-databowl-nba-rookie-options.vercel.app/
- Source code: https://github.com/SaraWang047671020/aqx-databowl-nba-rookie-options

## Built with
python · scikit-learn · pandas · transformers (RoBERTa) · react · typescript · vite · plotly · vercel · openai-api · basketball-reference · kaggle

---

## About the project

### The problem
Every first-round pick signs a rookie-scale contract: two guaranteed seasons, then team options for years three and four, each due by October 31 a year in advance. The fourth-year call comes after only two seasons of evidence. Keep a bust and you burn cap space; cut a late bloomer and you hand a rival a bargain. Research on the NBA's sunk-cost bias (Staw & Hoang, 1995) shows that teams give high picks extra rope simply because they were high picks. We wanted to replace that instinct with a transparent, testable rule.

### Our solution
Rookie Option Lab turns two seasons of NBA data into an option recommendation in four steps:

1. **Predict.** A Lasso regression on 46 first-two-season features (trained on 1,252 players, 2000–2023) forecasts year-3 Win Shares. Test R² = 0.577, RMSE = 1.79 WS.
2. **Price.** Win Shares are converted to a share of the salary cap (cap × 30 teams × BRI ÷ 1,230 games) and compared with the rookie-scale cost of the player's draft slot.
3. **Add off-court signal.** A news scraper, TF-IDF de-duplication, RoBERTa sentiment and Bayesian smoothing produce a cohort-relative **Star Power Index**.
4. **Decide.** A five-gate real-options waterfall checks clear surplus, a statistical buffer for model error (1.25 × RMSE, the option's time value), opportunity cost and star-power rescue. Only a player who fails every safety net is a **stop loss**.

Every recommendation can be traced gate by gate on the site.

### Results
**Backtest: 329 first-round picks, 2013–2023 cohorts**
- Exercise / keep / decline: **226 / 70 / 33**
- **30 of 32** declined players with a year-3 record produced below the replacement bar (**93.75%**)
- Only **2** players who reached the bar were wrongly declined. The rule is conservative by design, matching teams' asymmetric costs.
- Net benefit proxy: **+118.9 salary-cap percentage points** (losses avoided on correct declines minus value given up on wrong ones)

**Out-of-time test: the 2024 cohort, never seen by the model**
We scraped new seasons from Basketball-Reference and scored the 2023 draft class, whose year-3 season has now been played.
- Forecast **R² = 0.70**, RMSE = 1.60 WS (30 players)
- **3 of 3** stop-loss calls fell short; **0** good players declined
- Against the teams' real fourth-year decisions (October 2025) the model agreed on **22 of 29**. Where they disagreed, the year-3 results favored the model 4 times and the team 3 times. Teams exercised Scoot Henderson (#3) and Bilal Coulibaly (#7); the model said decline, and both produced 1.0 WS.

**Live calls: the 2025 cohort (2024 draft)**
Teams must decide these fourth-year options by **November 2, 2026**, after this submission deadline. We publish the model's calls for all 28 players before the deadline: 20 exercise, 3 keep, 5 decline. As of October 24, 13 decisions have been announced and **11 match the model**. The live page will keep comparing calls to real decisions.

**Six models, one decision rule**
We re-ran Lasso, Ridge, Elastic Net, PLS, Random Forest and Gradient Boosting under identical conditions. Forecast accuracy is nearly tied (test R² 0.574–0.581), but Lasso makes the best decisions (highest accuracy and net benefit). It also has the smallest train–test gap (0.005 vs. 0.08–0.16 for the tree models) and the most readable coefficients.

### Features
- **Player lookup:** the year-3 forecast with its error band, the five-gate decision path, and a hindsight check against what actually happened, including the team's real option decision.
- **AI scouting report:** a printable, shareable report per player. Computed sections are combined with OpenAI-written analysis. The AI only sees information available on the decision date, never the player's later results.
- **Cohort explorer:** every pick in a draft class on one value-vs-cost map.
- **Backtest results:** hit rate, net benefit, forecast accuracy, the full stop-loss list and the out-of-time test.
- **Policy simulator:** make the front office more or less cautious and re-run all 329 decisions in the browser.
- **New player evaluation:** enter two seasons of stats and get a forecast and recommendation instantly.
- **Live 2026 and model comparison pages**, plus a full method page with formulas and caveats.
- Fully **bilingual (English / Traditional Chinese)**, light and dark mode, responsive layout.

### Actionable impact
- **For front offices:** a decision rule they can audit before the October deadline. It flags expensive high picks at risk (e.g., the 2013 #1 pick Anthony Bennett: forecast 0.68 WS, actual 0.1) while almost never cutting a future contributor.
- **For cap planning:** every call is expressed in salary-cap percentage points, so decisions can be weighed against free-agent alternatives.
- **For accountability:** the live page lets anyone check the model against real decisions as they are announced.

### How we built it
Python (pandas, scikit-learn, Hugging Face transformers) for the data pipeline, models and backtest. The web app is React + TypeScript on Vercel. The trained model and the full decision engine run in the browser and are verified against the Python research code: all 329 + 59 decisions match exactly. A single serverless function calls OpenAI for scouting reports, so the API key never reaches the browser.

### Challenges
- **Decision timing:** the third-year option is due after just one season, so a two-season model honestly maps to the fourth-year option. We built the whole product around that.
- **Leakage:** historical forecasts are re-trained year by year without the target cohort. AI reports are written "as of the decision date". The 2024 cohort provides a true out-of-time test.
- **Noisy text:** de-duplicating syndicated headlines and filtering same-name and non-basketball stories before sentiment scoring.

### Limitations
Year-3 Win Shares is a single, noisy target. The model under-forecasts breakout players (Darius Garland: forecast 0.79, actual 6.3). Contract costs approximate the rookie scale. The Star Power Index is not validated against revenue. The out-of-time test covers only 30 players. Recommendations should support, not replace, scouting and coaching judgment.

### What's next
Score the 2025 cohort's calls after the November 2 deadline and the 2026-27 season. Build a rookie-season-only model for the third-year option. Replace the cost approximation with exact rookie-scale salaries.
