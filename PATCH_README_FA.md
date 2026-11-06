# پچ مدرسه‌یار اولیا — ارتقا از ۱.۱.۰ به ۱.۲.۰

این پچ روی پوشه پروژه نسخه ۱.۱.۰ استخراج شود و فایل‌های هم‌نام جایگزین شوند. ساختار پوشه `src/` و `tests/` حفظ شود.

فایل‌های اصلی تغییرکرده:
- `App.js`
- `src/theme.js`
- `src/parent.mjs`
- `package.json` و `app.json`
- آزمون‌های جدید و مستندات نسخه

پس از جایگزینی:

```powershell
npm install
npm run verify
npx eas-cli@latest build --platform android --profile preview
```

این پچ سورس است و APK آماده نصب در آن وجود ندارد. از پوشه پروژه و تنظیمات خود نسخه پشتیبان نگه دارید.
