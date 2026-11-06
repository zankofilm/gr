# وضعیت ساخت نسخه ۱.۲.۳

## یافته از لاگ واقعی GitHub نسخه ۱.۲.۲
- بررسی Expo dependency و هر ۲۵ آزمون خودکار موفق بودند.
- `expo prebuild` پوشه Android را با موفقیت تولید کرد.
- Workflow پیش از اجرای Gradle، در اسکریپت `enable-standalone-debug-bundle.cjs` متوقف شد؛ بنابراین APK نسخه ۱.۲.۲ ساخته نشد.
- اسکریپت قبلی به‌جای استفاده از variant استاندارد Release، تلاش می‌کرد `debuggableVariants` را با تطبیق متنی تغییر دهد. این روش در برابر ساختار Gradle تولیدشده توسط Expo پایدار نبود.

## اصلاح نسخه ۱.۲.۳
- مرحله تغییر دستی Gradle حذف شد.
- Workflow اکنون `:app:assembleRelease` را اجرا می‌کند؛ در variant انتشار، React Native bundle جاوااسکریپت را داخل APK می‌سازد و برای اجرای اپ به Metro وابسته نیست.
- پس از Build، Workflow وجود `assets/index.android.bundle` و اندازه بیش از ۱ کیلوبایت را داخل `app-release.apk` بررسی می‌کند.
- Android `versionCode` برابر ۶ است و شناسه بسته بدون تغییر مانده است.

**وضعیت:** سورس و Workflow اصلاح شده‌اند. APK واقعی هنوز تا اجرای موفق GitHub Actions ساخته و تأیید نشده است. نصب، اجرای اولیه، ورود و اتصال به هاست باید روی گوشی واقعی بررسی شوند.
