/* ICT بالعربي 6.8.43 — shared, local-only economic results interpretation. */
(function(root){
 'use strict';
 const KEY='ict-economic-results-private-v1';
 const pct='percentage-points';
 function rows(){
  try{
   const data=JSON.parse(localStorage.getItem(KEY)||'null');
   if(data?.source!=='Forex Factory'||!Array.isArray(data.events))return [];
   return data.events.slice(0,3000).filter(e=>e&&typeof e.title==='string'&&e.title.length<260&&typeof e.date==='string'&&Number.isFinite(Date.parse(e.date))&&e.values&&typeof e.values==='object'&&e.source==='Forex Factory').map(e=>({
    id:String(e.id||''),title:e.title,date:e.date,currency:String(e.country||e.currency||'').slice(0,8).toUpperCase(),impact:String(e.impact||'').toLowerCase(),
    actual:String(e.values.actual??'—'),forecast:String(e.values.forecast??'—'),previous:String(e.values.previous??'—'),
    source:'Forex Factory',comparison:e.comparison||null,lastSeenAt:e.lastSeenAt||null,revisions:Array.isArray(e.revisions)?e.revisions.slice(-25):[]
   })).filter(e=>e.id&&e.currency&&e.actual!=='—'&&e.actual!=='null');
  }catch{return []}
 }
 function number(raw){
  const s=String(raw??'').trim().replace(/[\s,]/g,'');
  const m=s.match(/^([+-]?(?:\d+(?:\.\d+)?|\.\d+))(%|[KMBT])?$/i);
  if(!m)return null;
  const unit=(m[2]||'').toUpperCase();
  const amount=Number(m[1])*(unit==='K'?1e3:unit==='M'?1e6:unit==='B'?1e9:unit==='T'?1e12:1);
  if(!Number.isFinite(amount))return null;
  return {amount,kind:unit==='%'?'percent':unit&&unit!=='%'?'count':'plain'};
 }
 function surprise(e){
  const a=number(e.actual),f=number(e.forecast);
  if(!a||!f||a.kind!==f.kind)return {comparable:false};
  const d=a.amount-f.amount;
  if(!Number.isFinite(d))return {comparable:false};
  return {comparable:true,difference:d,unit:a.kind==='percent'?pct:a.kind,tone:Math.abs(d)<1e-9?'equal':d>0?'above':'below'};
 }
 function classify(title){
  const t=String(title||'').toLowerCase();
  if(/unemployment rate|jobless rate|claimant count|jobless claims|unemployment claims|continuing claims|initial claims/.test(t))return {type:'labor-negative',title:'سوق العمل والبطالة'};
  if(/non.farm|nonfarm|employment change|adp|payrolls|jolts job openings|job openings/.test(t))return {type:'labor-positive',title:'التوظيف وفرص العمل'};
  if(/cpi|consumer price|pce price|core pce|ppi|producer price|inflation rate|inflation expectations/.test(t))return {type:'inflation',title:'التضخم'};
  if(/interest rate|federal funds|rate decision|official bank rate|cash rate|deposit facility rate|policy rate/.test(t))return {type:'rates',title:'السياسة النقدية'};
  if(/retail sales|consumer spending/.test(t))return {type:'growth',title:'إنفاق المستهلك'};
  if(/gdp|gross domestic product|industrial production|manufacturing production/.test(t))return {type:'growth',title:'النشاط الاقتصادي'};
  if(/pmi|ism manufacturing|ism services|business activity/.test(t))return {type:'growth',title:'مؤشرات النشاط'};
  if(/consumer confidence|consumer sentiment|economic sentiment/.test(t))return {type:'confidence',title:'الثقة الاقتصادية'};
  return {type:'unknown',title:'مؤشر غير مصنف'};
 }
 function explain(e){
  const c=surprise(e), k=classify(e.title);
  if(!c.comparable)return {category:k.title,headline:'المقارنة غير متاحة',description:'لا تتوفر قيمتان رقميتان متوافقتان للفعلي والمتوقع؛ لا يمكن إصدار تفسير للمفاجأة.',comparison:c,confidence:'unavailable'};
  if(c.tone==='equal')return {category:k.title,headline:'مطابق للتوقعات',description:'النتيجة مطابقة للتوقعات حسابيًا. قد تؤثر المراجعات والتفاصيل المرافقة والتسعير المسبق في رد فعل السوق.',comparison:c,confidence:'context'};
  const higher=c.difference>0;
  const relative=higher?'أعلى':'أقل';
  let desc='القراءة '+relative+' من المتوقع، لكن لا يمكن تحديد أثرها الاقتصادي من اسم المؤشر وحده؛ راجع الخبر الأصلي ومكوناته.';
  let confidence='unknown';
  if(k.type==='inflation'){desc=higher?'التضخم أعلى من التوقعات، وقد يزيد توقعات التشدد النقدي ويدعم العملة والعوائد في بعض الظروف؛ وقد يضغط على الذهب.':'التضخم أقل من التوقعات، وقد يخفف توقعات التشدد النقدي ويضغط على العملة والعوائد في بعض الظروف؛ وقد يدعم الذهب.';confidence='conditional'}
  else if(k.type==='labor-positive'){desc=higher?'التوظيف/الطلب على العمالة أقوى من المتوقع؛ قد يدعم العملة إذا زادت توقعات الفائدة.':'التوظيف/الطلب على العمالة أضعف من المتوقع؛ قد يضغط على العملة إذا عزز توقعات خفض الفائدة.';confidence='conditional'}
  else if(k.type==='labor-negative'){desc=higher?'البطالة أو طلبات الإعانة أعلى من المتوقع، ما قد يشير إلى ضعف سوق العمل ويضغط على العملة.':'البطالة أو طلبات الإعانة أقل من المتوقع، ما قد يشير إلى تماسك سوق العمل ويدعم العملة.';confidence='conditional'}
  else if(k.type==='rates'){desc=higher?'مستوى الفائدة المعلن أعلى من التوقعات الرقمية؛ قد يدعم العملة، لكن بيان البنك وتوقعات الأسواق أكثر أهمية.':'مستوى الفائدة المعلن أقل من التوقعات الرقمية؛ قد يضغط على العملة، لكن بيان البنك وتوقعات الأسواق أكثر أهمية.';confidence='conditional'}
  else if(k.type==='growth'||k.type==='confidence'){desc=higher?'نشاط/ثقة اقتصادية أقوى من التوقعات، وقد يدعم العملة، مع مراعاة التضخم وتوقعات البنوك المركزية.':'نشاط/ثقة اقتصادية أضعف من التوقعات، وقد يضغط على العملة، مع مراعاة التضخم وتوقعات البنوك المركزية.';confidence='conditional'}
  return {category:k.title,headline:relative+' من المتوقع',description:desc+' هذه قراءة احتمالية وليست إشارة تداول أو قياسًا لحركة السعر الفعلية.',comparison:c,confidence};
 }
 function differenceText(c){
  if(!c?.comparable)return 'غير قابلة للمقارنة';
  const n=c.difference;
  const value=new Intl.NumberFormat('en-US',{maximumFractionDigits:5}).format(n);
  const unit=c.unit===pct?' نقطة مئوية':c.unit==='count'?' وحدة':'';
  return (n>0?'+':'')+value+unit;
 }
 root.ICTEconomicResults={KEY,rows,surprise,classify,explain,differenceText};
})(window);
