# ICT بالعربي — 6.8.41 | Economic Results Engine — Proof of Concept

**نوع الحزمة:** تحديث جزئي فقط فوق الإصدار 6.8.40.

## المضاف
- `scripts/economic_results_core.py`: تدقيق النتائج وحساب المفاجأة الاقتصادية مع الوحدات وتسجيل تغير القيم.
- `scripts/update_economic_results.py`: محرك تجربة مستقل يجلب أخبار الأسبوع الحالي والسابق من صفحات Forex Factory؛ لا يصنع قيمًا مفقودة.
- `scripts/test_economic_results.py`: تسعة اختبارات للحالات الحسابية والزمنية والتعديلات.
- `.github/workflows/probe-economic-results.yml`: تجربة يدوية من GitHub Actions مع تنزيل مخرجاتها في Artifact لمدة 3 أيام.

## المعدل
- `scripts/ff_web_calendar.py`: تمرير معرف الحدث إن كان موجودًا في الصفحة، لتحسين التطابق بين مرات الجلب. لم نغيّر منطق أجندة الموقع الحالي.

## التشغيل
1. فك ضغط الأرشيف وارفع الملفات بنفس مساراتها إلى مستودع GitHub فوق 6.8.40.
2. في GitHub: **Actions** ← **Probe Forex Factory economic results (private preview)** ← **Run workflow**.
3. راقب نتائج الاختبارات في سجل المهمة، ثم نزّل Artifact باسم `ff-economic-results-preview` وافتح `economic-results-status.json`.
4. النجاح التجريبي يتطلب أن يكون في `weeks` أسبوع واحد ناجح على الأقل، وأن تكون قيمة `releasedWithActual` أكبر من صفر.
5. افتح `economic-results-preview.json` للفحص الداخلي فقط؛ لن يظهر بعد في الموقع لأن هذا اختبار مرحلة أولى.

## القيود والمخاطر
- لا يمكن تأكيد الوصول الحي من GitHub Actions إلا بعد تشغيل المهمة في مستودعك. الموقع قد يرفض الطلبات.
- إذا فشل الوصول سيظهر سبب الفشل، ولا نعتبره نجاحًا زائفًا.
- هذا التحديث **لا يغيّر** الأجندة الأسبوعية، ولا تنبيهات الهاتف، ولا `intelligence.js`، ولا واجهة الموقع.
- حفظ سجل التعديلات الدائم بين جلسات GitHub لم يفعّل بعد؛ المحرك يدعم تحميل لقطة سابقة اختيارية عبر `--previous` للتجارب المحلية.
- لا تنشر أرشيف النتائج أو إعادة توزيع بيانات Forex Factory للعموم قبل التحقق من شروط الاستخدام والتصاريح المناسبة.
- مرحلة الربط النهائي بمختبر الأخبار تأتي بعد نجاح الفحص على بيانات حقيقية والتحقق من صلاحية عرضها.

## اختبار محلي بدون إنترنت
```bash
python -m pip install requests beautifulsoup4
python -m unittest discover -s scripts -p 'test_economic_results.py' -v
python -m unittest discover -s scripts -p 'test_ff_web_calendar.py' -v
```
