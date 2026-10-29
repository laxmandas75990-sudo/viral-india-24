VIRAL INDIA 24 — Website Starter
================================

इस ZIP में:
- मोबाइल-फ्रेंडली Red & Black न्यूज़ वेबसाइट
- RSS से headlines अपने आप लाने का server endpoint
- Password-protected Admin Panel
- Admin से story publish/delete
- Search, categories और share button

महत्वपूर्ण:
यह ZIP तैयार starter project है, अपने-आप internet पर live नहीं है। इसे Node.js 20+ सपोर्ट वाले hosting provider पर deploy करना होगा। इस चैट से आपके hosting account में login/deploy नहीं किया गया है।

Local computer पर चलाने के लिए:
1. Node.js 20 या नया install करें.
2. इस folder में terminal/command prompt खोलें.
3. .env.example की copy बनाकर .env नाम दें; ADMIN_PASSWORD में मजबूत, अलग password रखें.
4. Environment variable set करें (Windows PowerShell उदाहरण):
   $env:ADMIN_PASSWORD="apna-mazboot-password-yahan"
   node server.js
5. Browser में http://localhost:3000 खोलें.

Hosting पर:
- Project files upload/connect करें.
- Start command: npm start
- Environment variable ADMIN_PASSWORD सेट करें (कम से कम 12 characters; लंबा random password बेहतर).
- Persistent disk/volume enable करें या posts.json restart/deploy पर खो सकता है.
- HTTPS enabled रखें; password को source code में कभी न डालें.

Automatic headlines:
- Server Google News RSS feeds पढ़ता है; feeds/network availability बदल सकती है.
- RSS headlines third-party reports हैं; original link खोलकर verify करें.
- यह कोई fact-checking engine नहीं है. गलत/भ्रामक दावे publish न करें.
- Production launch से पहले privacy policy, contact/about page, corrections policy, backups और hosting security जोड़ें.

Admin:
- Website के Admin section में ADMIN_PASSWORD से login करें.
- आपकी published stories server पर data/posts.json में सेव होंगी.
- Admin token browser session में रहता है और 8 घंटे बाद expire होता है.
