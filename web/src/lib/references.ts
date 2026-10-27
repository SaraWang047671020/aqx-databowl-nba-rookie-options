/**
 * 參考文獻：第一部分完全依研究報告（專題報告_final_v3.pdf）「參考文獻」之內容與順序（Chicago 作者－年份格式）；
 * 第二部分為網站在研究之後新增分析（2024、2025 梯次、球團實際決定）所用的資料來源。
 */
export interface Ref {
  text: string;
  url?: string;
}

export const REPORT_REFERENCES: Ref[] = [
  { text: "Arkes, Hal R., and Catherine Blumer. 1985. “The Psychology of Sunk Cost.” Organizational Behavior and Human Decision Processes 35(1): 124-140." },
  { text: "Breiman, Leo. 2001. “Random Forests.” Machine Learning 45(1): 5-32." },
  { text: "Datta, Sumitro. n.d. “NBA Stats (1947-present).” Kaggle dataset.",
    url: "https://www.kaggle.com/datasets/sumitrodatta/nba-aba-baa-stats" },
  { text: "Greene, Alexander C. 2015. The Success of NBA Draft Picks: Can College Careers Predict NBA Winners? Master's thesis, St. Cloud State University, St. Cloud, MN." },
  { text: "ICLiu30. n.d. “NBA Player Stats and Injured Data from 13 to 23.” Kaggle dataset.",
    url: "https://www.kaggle.com/datasets/icliu30/nba-player-stats-and-injured-data-from-13-to-23" },
  { text: "Kannan, Adarsh, Brian Kolovich, Brandon Lawrence, and Sohail Rafiqi. 2018. “Predicting National Basketball Association Success: A Machine Learning Approach.” SMU Data Science Review 1(3): Article 7." },
  { text: "Kubatko, Justin, Dean Oliver, Kevin Pelton, and Dan T. Rosenbaum. 2007. “A Starting Point for Analyzing Basketball Statistics.” Journal of Quantitative Analysis in Sports 3(3).",
    url: "https://doi.org/10.2202/1559-0410.1070" },
  { text: "Li, Yung-Ming, Chin-Yu Hsieh, and Shi-Nien Fan. 2024. “A Social Selection Mechanism for Sports Betting Market.” Decision Support Systems 178: 114119." },
  { text: "Liu, Yinhan, Myle Ott, Naman Goyal, Jingfei Du, Mandar Joshi, Danqi Chen, Omer Levy, Mike Lewis, Luke Zettlemoyer, and Veselin Stoyanov. 2019. “RoBERTa: A Robustly Optimized BERT Pretraining Approach.” arXiv preprint arXiv:1907.11692.",
    url: "https://arxiv.org/abs/1907.11692" },
  { text: "Loureiro, Daniel, Francesco Barbieri, Leonardo Neves, Luis Espinosa Anke, and Jose Camacho-Collados. 2022. “TimeLMs: Diachronic Language Models from Twitter.” In Proceedings of the 60th Annual Meeting of the Association for Computational Linguistics: System Demonstrations, 251-260. Dublin, Ireland: Association for Computational Linguistics." },
  { text: "Mir, Saadan. 2022. “NBA Draft Analysis: Using Machine Learning to Project NBA Success.” Towards Data Science, February 7.",
    url: "https://towardsdatascience.com/nba-draft-analysis-using-machine-learning-to-project-nba-success-a1c6bf576d19/" },
  { text: "Myers, Stewart C. 1977. “Determinants of Corporate Borrowing.” Journal of Financial Economics 5(2): 147-175." },
  { text: "National Basketball Association and National Basketball Players Association. 2023. Collective Bargaining Agreement. New York: National Basketball Association." },
  { text: "Papageorgiou, George, Vangelis Sarlis, and Christos Tjortjis. 2024. “Evaluating the Effectiveness of Machine Learning Models for Performance Forecasting in Basketball: A Comparative Study.” Knowledge and Information Systems 66(7): 4333-4375." },
  { text: "Park, Oliver Geun Hyung. 2025. “Computational Analysis of NBA Players with Machine and Deep Learning.” National High School Journal of Science.",
    url: "https://nhsjs.com/2025/computational-analysis-of-nba-players-with-machine-and-deep-learning/" },
  { text: "Pedregosa, Fabian, Gaël Varoquaux, Alexandre Gramfort, et al. 2011. “Scikit-learn: Machine Learning in Python.” Journal of Machine Learning Research 12: 2825-2830." },
  { text: "Staw, Barry M., and Ha Hoang. 1995. “Sunk Costs in the NBA: Why Draft Order Affects Playing Time and Survival in Professional Basketball.” Administrative Science Quarterly 40(3): 474-494." },
  { text: "Tibshirani, Robert. 1996. “Regression Shrinkage and Selection via the Lasso.” Journal of the Royal Statistical Society: Series B (Methodological) 58(1): 267-288." },
];

export const SITE_SOURCES: Ref[] = [
  { text: "Sports Reference LLC. n.d. “NBA Season Summaries” (2023-24, 2024-25, 2025-26 per-game and advanced statistics) and “NBA Draft” (2021–2024). Basketball-Reference.com. Accessed October 2026.",
    url: "https://www.basketball-reference.com/" },
  { text: "Adams, Luke. 2025. “Decisions On 2026/27 Rookie Scale Team Options.” Hoops Rumors, August 28.",
    url: "https://www.hoopsrumors.com/2025/08/decisions-on-2026-27-rookie-scale-team-options.html" },
  { text: "Adams, Luke. 2026. “Decisions On 2027/28 Rookie Scale Team Options.” Hoops Rumors, September 4. Accessed October 24, 2026.",
    url: "https://www.hoopsrumors.com/2026/09/decisions-on-2027-28-rookie-scale-team-options.html" },
  { text: "National Basketball Association. 2025. “NBA Salary Cap for 2025-26 Season Set at $154.647 Million.” NBA Communications, June 30.",
    url: "https://pr.nba.com/nba-salary-cap-2025-26-season" },
  { text: "yhsarawang. n.d. “NBA Players First Two Year Average Data.” Kaggle dataset.",
    url: "https://www.kaggle.com/datasets/yhsarawang/nba-players-first-two-year-average-data" },
];
