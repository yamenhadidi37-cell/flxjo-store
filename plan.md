# خطة تسليم FlexJo VIP

## القرار
اعتماد التطبيق الموجود في الملف المرفق بدل الواجهة التجريبية السابقة. التطبيق React/Vite كامل ويقرأ فقط من مشروع Firebase `kpro-a1c5d`، من المجموعات `vip_media` و`live_channels` و`folders`.

## ما تم التحقق منه
- اتصال Firestore ناجح عبر الإعداد الصحيح: 292 عملًا، 7 قنوات، و5 مجلدات.
- التطبيق يدمج مواسم المسلسلات عبر `parentSeries` و`seasonName` ويخفي السجلات التي `hidden=true` في العرض.
- البوسترات تُقرأ من `posterUrl`، وتوجد معالجة بديلة عند فقدان الصورة.
- صفحات التطبيق تستخدم مسارات نظيفة: `/`, `/movies`, `/series`, `/live`, `/folders`, `/media/:id`, `/watch/:id/episode/:episode`, `/watchlist`.
- تمت إضافة `public/manus-routes.json`، و`robots.txt`، ومولد `sitemap.xml` يقرأ البيانات وقت البناء، مع fallback للنسخة السابقة.
- `pnpm run lint` و`pnpm run build` ينجحان. تحذير Vite الحالي متعلق بحجم bundle واستخدام `__dirname` في config وليس خطأ تشغيل.

## حدود النشر
لا يتم تعديل أو حذف أي بيانات في Firebase. نشر النسخة على الدومين يحتاج أن يكون `flexjo.sbs` موجّهًا إلى استضافة المشروع أو أن يتم ربطه من إعدادات Webdev؛ لا يتم تغيير DNS تلقائيًا من داخل التطبيق.
