# وضعیت ساخت نسخه ۱.۲.۲

- علت خطای گزارش‌شده روی گوشی شناسایی شد: Workflow نسخه Debug را بدون بسته‌بندی JS در APK می‌ساخت؛ در نتیجه React Native برای اجرای اپ به Metro نیاز داشت.
- اسکریپت `scripts/enable-standalone-debug-bundle.cjs` پس از Expo Prebuild مقدار `debuggableVariants = []` را به تنظیمات React Native اضافه می‌کند.
- Workflow پس از ساخت APK، وجود `assets/index.android.bundle` و اندازه آن را داخل APK بررسی می‌کند؛ در صورت نبود فایل، انتشار Artifact متوقف می‌شود.
- نسخه برنامه ۱.۲.۲ و Android `versionCode` برابر ۵ است تا نسخه جدید روی نسخه ۱.۲.۱ نصب شود.
- ۲۵ آزمون خودکار Node.js و بررسی JSX در این محیط موفق شدند؛ ساخت واقعی APK و بررسی bundle نهایی در GitHub Actions انجام می‌شود.

**وضعیت:** اصلاح Workflow و سورس انجام شده؛ APK نسخه ۱.۲.۲ تا اجرای موفق GitHub Actions و نصب/اجرای موفق روی گوشی تأیید نهایی نشده است.
