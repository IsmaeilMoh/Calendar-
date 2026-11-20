/* ICT بالعربي v6.7 — UI only, no data or push subscription changes. */
(() => {
  'use strict';
  const renderEnhancement = () => {
    const grid = document.querySelector('#app .ops-room-v66 .ops-grid');
    if (!grid || grid.querySelector('.ops-card-dna')) return;

    const card = document.createElement('a');
    card.className = 'ops-card ops-card-dna';
    card.href = 'smart-desk.html';
    card.setAttribute('aria-label', 'افتح بصمة أدائك في غرفة المتداول الذكية');
    card.innerHTML = `
      <div class="ops-card-top">
        <span class="ops-tag">TRADER DNA</span>
        <span class="ops-kicker">مراجعة الأداء</span>
      </div>
      <h3>بصمة أدائك</h3>
      <p class="ops-copy">سجّل نتائج صفقاتك، وقارن أداءك حسب الأصل والجلسة والاستراتيجية لتكتشف ما يحتاج تحسينًا.</p>
      <span class="ops-v66-arrow">تحليل سجل التداول ←</span>`;
    grid.appendChild(card);
  };

  // app.js rebuilds homepage on navigation; enhance each fresh render once.
  let pending = false;
  const schedule = () => {
    if (pending) return;
    pending = true;
    requestAnimationFrame(() => { pending = false; renderEnhancement(); });
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', schedule, {once:true});
  } else schedule();
  const host = document.getElementById('app');
  if (host) new MutationObserver(schedule).observe(host, {childList:true,subtree:true});
  window.addEventListener('hashchange', schedule);
})();
