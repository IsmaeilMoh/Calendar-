# ICT بالعربي 6.8.37 — FOREX FACTORY FIRST

تحديث جزئي يوضع فوق الإصدار 6.8.36. لا يتضمن أي ملفات واجهة أو تغييرات تصميم.

## ما تغير
- بدل طلب `ff_calendar_nextweek.json` الذي يعيد 404، نحاول قراءة صفحة الأسبوع المحدد مباشرة من Forex Factory:
  `https://www.forexfactory.com/calendar?week=nov23.2026` (مثال).
- الطلب من GitHub Actions ويستخدم منطقة GMT، ثم يحفظ توقيت الحدث UTC؛ وتتحقق المعالجة من وقوعه في أسبوع غزة المطلوب.
- يشمل الأخبار المتاحة بتوقيت محدد فقط: أحداث `All Day` و`Tentative` التي تفتقد ساعة واضحة لا تُحفظ، تجنبًا لاختراع توقيت.
- يمكن أن يحظر Forex Factory وصول GitHub Actions (403 / تحدي Cloudflare) أو يغير بنية HTML، لذا **لا يمكن ضمان نجاح هذا المسار قبل تشغيله في مستودعك**.
- إذا فشل الموقع، يجرب السكربت ملف `thisweek` من Forex Factory بعد انتقال أسبوعه؛ ويحتفظ بالنسخة الكاملة السابقة إن وُجدت.
- يظل مقتطف XOOMAR احتياطيًا محدودًا وموسومًا `coverage: partial` **فقط عند فشل Forex Factory**. لا يعتبر أبدًا أجندة كاملة.

## ملفات التحديث
- `scripts/update_calendar.py` تعديل ترتيب مصادر جلب الأسبوع القادم.
- `scripts/ff_web_calendar.py` جديد: قارئ صفحة أسبوع Forex Factory.
- `scripts/test_ff_web_calendar.py` جديد: اختبارات محلية للقراءة والتحقق.
- `.github/workflows/update-calendar.yml` إضافة تثبيت `requests` و`beautifulsoup4`.
- `RELEASE_6.8.37_AR.md` هذه التعليمات.

## التثبيت
1. ارفع محتويات ZIP مع الحفاظ على مساراتها داخل مستودع GitHub، واستبدل الملفات الموجودة بنفس المسار.
2. GitHub > Actions > Update economic calendar > Run workflow.
3. افتح `calendar-sync-status.json` وافحص `nextWeek`:
   - `coverage: "full"` و`via: "forexfactory-week-page"`: وصلت بيانات Forex Factory من صفحة الأسبوع المحددة.
   - `coverage: "full"` و`via: "current-week rollover"`: وصلت من تغذية Forex Factory للأسبوع الجاري بعد انتقالها.
   - `coverage: "partial"`: الموقع الأساسي لم ينجح، وما زالت البيانات الاحتياطية محدودة؛ افحص `primaryError`.
4. إذا ظهر `403`, أو `calendar table unavailable`، قد يلزم أسلوب وصول مصرح به من Forex Factory؛ هذا الإصدار **لا يتجاوز** حماية الموقع.

## حدود التحقق
اختبارات Python الوحدوية الخمسة نجحت باستخدام HTML اصطناعي؛ لم يتم التحقق من جلب بيانات Forex Factory الحية بواسطة GitHub Actions من هذه البيئة. عدم ظهور بيانات Forex Factory بعد النشر يحتاج فحص رسالة `primaryError` الجديدة، وليس افتراض نجاح المصدر.
