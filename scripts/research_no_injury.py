"""Current report analysis. No injury deduction, no WS retraining, no webapp dependency."""
from pathlib import Path
import json
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'results/no_injury'
OUT.mkdir(parents=True,exist_ok=True)
def classify(frame,multiplier=1.25):
    x=frame.copy()
    ans=x.Pred_Salary_Share_Percent-x.Est_Cost_Percent
    floor=x.Star_Power_Index.fillna(0).groupby(x.year_start).transform(lambda s:s.quantile(.7))
    b=multiplier*RMSE
    x['stage']=np.select([ans>0,ans>=-b,x.Pred_WS>=x.Dynamic_Truth_WS,
                         (x.Star_Power_Index.fillna(0)>=floor)&(ans>=-1.5*b)],
                        ['profit','buffer','opportunity','star'],default='reject')
    x['color']=x.stage.map({'profit':'blue','buffer':'green','opportunity':'green','star':'green','reject':'red'})
    x['Adjusted_Net_Surplus']=ans
    x['Risk_Penalty_Percent']=0.0
    x['Star_Power_Floor']=floor
    return x

pred=pd.read_csv(ROOT/'data/NBA_Predicted_WS.csv')
pred=pred[pred.year_start.between(2013,2023)].copy()
master=pd.read_csv(ROOT/'data/NBA_Player_Final_Master_Features.csv')
master=master[master.DraftYear.between(2013,2023)]
assert not master.duplicated(['Player','DraftYear']).any()
p=pred.merge(master[['Player','DraftYear','Star_Power_Index']],left_on=['Player','year_start'],right_on=['Player','DraftYear'],how='left',validate='one_to_one')
RMSE=json.loads((ROOT/'webapp/models/model_meta.json').read_text(encoding='utf-8'))['test_rmse']
p=classify(p)
assert len(p)==329 and p.color.value_counts().to_dict()=={'blue':226,'green':70,'red':33}
valid=p.Year3_WS.notna()
good=p.Year3_WS>=p.Dynamic_Truth_WS
rows=[]
for label,mask in [('all',valid),('2013-2018',valid&p.year_start.le(2018)),('2019-2023',valid&p.year_start.ge(2019))]:
    yes=p.color.ne('red')
    tp=int((yes&good&mask).sum());fp=int((yes&~good&mask).sum());tn=int((~yes&~good&mask).sum());fn=int((~yes&good&mask).sum())
    rows.append(dict(split=label,n=int(mask.sum()),TP=tp,FP=fp,TN=tn,FN=fn,score=10*tp-10*fp+5*tn-5*fn,accuracy=(tp+tn)/mask.sum()))
performance=pd.DataFrame(rows)
old=pd.read_csv(ROOT/'data/Declined_Players_Validation.csv')
red=p[p.color.eq('red')].merge(old[['Player','Draft_Year','Outcome_Label','Never_Reached_Year3','Year4','Actual']],left_on=['Player','year_start'],right_on=['Player','Draft_Year'],validate='one_to_one')
assert len(red)==33 and red.Outcome_Label.notna().all()
red['below_threshold']=red.Year3_WS<red.Dynamic_Truth_WS
red['known_below_or_no_year3']=red.below_threshold|red.Never_Reached_Year3
red['Pred_Error']=red.Pred_WS-red.Year3_WS
summary=dict(players=329,blue=226,green=70,red=33,labeled=306,unlabeled=23,
    red_labeled=int(red.Year3_WS.notna().sum()),red_below=int(red.below_threshold.sum()),
    red_no_year3=int(red.Never_Reached_Year3.sum()),red_below_or_no_year3=int(red.known_below_or_no_year3.sum()),
    red_mae=float(red.Pred_Error.abs().mean()),red_bias=float(red.Pred_Error.mean()),
    disposition_counts=red.Outcome_Label.value_counts().to_dict())
confirmed=red.Outcome_Label.eq('Confirmed Bust');false=red.Outcome_Label.eq('Possible False Positive')
summary['disposition_net_proxy']=float(red.loc[confirmed,'Adjusted_Net_Surplus'].abs().sum()-red.loc[false,'Adjusted_Net_Surplus'].abs().sum())
yearly=p.groupby('year_start').agg(n=('Player','size')).reset_index()
for color in ['blue','green','red']:
    yearly[color]=yearly.year_start.map(p[p.color.eq(color)].groupby('year_start').size()).fillna(0).astype(int)
for stage in ['buffer','opportunity','star']:
    yearly[stage]=yearly.year_start.map(p[p.stage.eq(stage)].groupby('year_start').size()).fillna(0).astype(int)
validation=[]
for year,g in red.groupby('year_start'):
    validation.append(dict(year=int(year),red=len(g),confirmed=int(g.Outcome_Label.eq('Confirmed Bust').sum()),
      traded=int(g.Outcome_Label.eq('Ambiguous / Traded').sum()),possible_error=int(g.Outcome_Label.eq('Possible False Positive').sum()),
      below=int(g.below_threshold.sum()),no_year3=int(g.Never_Reached_Year3.sum()),labeled=int(g.Year3_WS.notna().sum())))
validation=pd.DataFrame(validation)
sensitivity=[]
for mult in [.5,.75,1,1.25,1.5,2]:
    q=classify(p,mult);r=q[q.color.eq('red')&q.Year3_WS.notna()]
    actual_surplus=r.Year3_WS*(30*r.BRI_Factor/1230*100)-r.Est_Cost_Percent
    avoided=float((-actual_surplus.clip(upper=0)).sum());sacrificed=float(actual_surplus.clip(lower=0).sum())
    counts=q.color.value_counts()
    sensitivity.append(dict(multiplier=mult,blue=int(counts.get('blue',0)),green=int(counts.get('green',0)),red=int(counts.get('red',0)),
      labeled_red=len(r),hit_rate=float((r.Year3_WS<r.Dynamic_Truth_WS).mean()),avoided=avoided,sacrificed=sacrificed,net=avoided-sacrificed))
sensitivity=pd.DataFrame(sensitivity)
for name,frame in [('decisions',p),('declined',red),('yearly',yearly),('validation',validation),('sensitivity',sensitivity),('performance',performance)]:
    frame.to_csv(OUT/(name+'.csv'),index=False,encoding='utf-8-sig')
(OUT/'summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2),encoding='utf-8')
plt.rcParams.update({'font.family':'DejaVu Sans','font.size':10})
fig,ax=plt.subplots(figsize=(9,4.3));ax.plot(sensitivity.multiplier,sensitivity.red,'o-',label='Stop-loss count');ax.set_xlabel('RMSE buffer multiplier');ax.set_ylabel('Players')
other=ax.twinx();other.plot(sensitivity.multiplier,100*sensitivity.hit_rate,'s--',color='darkorange');other.set_ylabel('Below-threshold share (%) among labeled rejects');ax.set_title('No additional injury deduction');fig.tight_layout();fig.savefig(OUT/'sensitivity.png',dpi=180);plt.close(fig)
fig,ax=plt.subplots(figsize=(9,4.3));ax.bar(validation.year,validation.below,label='Below WS threshold');ax.bar(validation.year,validation.red-validation.below-validation.no_year3,bottom=validation.below,label='At/above threshold');ax.bar(validation.year,validation.no_year3,bottom=validation.red-validation.no_year3,label='No year-3 record');ax.set_xticks(validation.year);ax.set_ylabel('Rejected players');ax.legend();fig.tight_layout();fig.savefig(OUT/'validation.png',dpi=180);plt.close(fig)
for year in [2023]:
    q=p[p.year_start.eq(year)];fig,ax=plt.subplots(figsize=(10,6));ax.scatter(q.Est_Cost_Percent,q.Pred_WS,c=q.color,s=65)
    for row in q.itertuples():ax.annotate(row.Player,(row.Est_Cost_Percent,row.Pred_WS),fontsize=6,xytext=(3,3),textcoords='offset points')
    ax.set_xlabel('Estimated contract cost (% of salary cap)');ax.set_ylabel('Predicted year-3 WS');ax.set_title(f'{year} cohort: no additional injury deduction');fig.tight_layout();fig.savefig(OUT/f'decision_{year}.png',dpi=180);plt.close(fig)
# Updated workflow figure replaces the old injury-dependent diagram.
fig,ax=plt.subplots(figsize=(8,5));ax.axis('off')
texts=['First two playing seasons\n46 fixed model features','Existing Lasso predictions\nYear-3 Win Shares','Contract value minus cost\nNo injury deduction','Waterfall decision\nFirst-round cohort SPI PR70','329 players\n226 blue / 70 green / 33 red']
positions=[(.25,.85),(.75,.85),(.75,.50),(.25,.50),(.25,.16)]
for txt,(x,y) in zip(texts,positions):
    ax.text(x,y,txt,ha='center',va='center',fontsize=13,bbox=dict(boxstyle='round,pad=.6',facecolor='#e8f1f5',edgecolor='#264653'))
for start,end in [((.45,.85),(.55,.85)),((.75,.73),(.75,.62)),((.55,.5),(.45,.5)),((.25,.38),(.25,.28))]:
    ax.annotate('',xy=end,xytext=start,arrowprops=dict(arrowstyle='->',lw=1.5))
ax.text(.74,.16,'Injury evidence:\nsupplementary checks only',ha='center',fontsize=12)
fig.tight_layout();fig.savefig(OUT/'workflow.png',dpi=180);plt.close(fig)
print(json.dumps(summary,ensure_ascii=False,indent=2));print(sensitivity.to_string(index=False))
