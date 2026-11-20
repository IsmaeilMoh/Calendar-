/* ICT بالعربي v6.8 — UI augmentation only. Never touch the push button, IDs, preferences or listeners. */
(() => {
  'use strict';
  const decorate = () => {
    for (const area of document.querySelectorAll('#app .notification-public.notification-compact')) {
      if (area.querySelector('.nl-benefits')) continue;
      const main = area.querySelector('.public-notify-main');
      const intro = main?.querySelector('.public-notify-intro');
      const actions = main?.querySelector('.public-notify-actions');
      if (!main || !intro || !actions) continue;
      const eyebrow = main.querySelector('.public-notify-eyebrow');
      if (eyebrow) eyebrow.textContent = 'الإشعارات الذكية';
      intro.textContent = 'تحليلات وتوصيات جديدة، وأخبار اقتصادية مهمة، وتنبيهات الجلسات وفق تفضيلاتك.';
      const benefits = document.createElement('ul');
      benefits.className = 'nl-benefits';
      benefits.setAttribute('aria-label', 'أنواع التنبيهات');
      for (const label of ['التحليلات والتوصيات', 'الأخبار المهمة', 'جلسات ICT']) {
        const li = document.createElement('li');
        li.textContent = label;
        benefits.appendChild(li);
      }
      actions.before(benefits);
    }
  };
  let queued = false;
  const schedule = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; decorate(); });
  };
  const start = () => {
    const host = document.getElementById('app');
    if (!host) return;
    decorate();
    new MutationObserver(schedule).observe(host, {childList: true, subtree: true});
    window.addEventListener('hashchange', schedule);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, {once:true});
  else start();
})();
