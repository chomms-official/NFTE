# MozzieMap / NFTE

เว็บ Next.js สำหรับสำรวจลูกโลกความเสี่ยงจากยุงแบบจำลอง มีหน้าหลักดังนี้:

- `/` — MozzieMap ลูกโลก เลือกประเทศ/ชนิดยุง และกราฟจำลอง
- `/simulator` — เส้นทางเดิมของหน้าลูกโลกเดียวกัน
- `/sent-scent` — งานนำเสนอ SENT SCENT ห้าขั้น

หน้าแรกไม่มีภาพหรือการ์ดสินค้า Chomm’s House เมื่อเบราว์เซอร์ใช้ WebGL ไม่ได้ ระบบจะใช้ software globe ทรงกลมที่ลาก/ซูม/เลือกประเทศได้แทน และยังดูข้อมูลชุดเดียวกันได้

คะแนน hotspot และประวัติรายวันเป็นข้อมูลจำลองในโปรเจกต์ ไม่ใช่รายงานเฝ้าระวังโรคแบบสด ลิงก์ WHO/CDC ใช้สำหรับข้อมูลความรู้พื้นฐาน

## เริ่มพัฒนา

ใช้ Node.js 24 และ npm 11 ตามสภาพแวดล้อมที่ตรวจสอบ ติดตั้งจาก lockfile แล้วเริ่ม dev server:

```bash
npm ci
npm run dev
```

สำหรับ production ใช้ Next runtime เพื่อรองรับ proxy ที่ส่ง host กลุ่ม `sentscent` ไป `/sent-scent`:

```bash
npm run build
npm run start -- --port 3001
```

ฟอนต์ถูกเก็บใน `src/app/fonts/` และใช้ `next/font/local` จึงไม่ต้องดาวน์โหลด Google Fonts ระหว่าง build

## ตรวจสอบ

```bash
npx tsc --noEmit
npm run lint
npm test
```

ทดสอบผ่าน browser หลังเริ่ม production server ที่ port 3001:

```bash
CHROMIUM_PATH=/usr/bin/chromium npm run test:browser
```

ปรับ `BASE_URL`, `CHROMIUM_PATH` และ `QA_ARTIFACTS` ให้ตรงกับเครื่องได้ ผลภาพและสรุป browser checks เริ่มต้นอยู่ที่ `/tmp/nfte-browser-results` ชุดตรวจครอบคลุม renderer WebGL/software, การโต้ตอบกับลูกโลก, การสูญเสีย context, ประเทศ/ชนิดยุง, หน้าจอมือถือ, SENT SCENT และการรักษา user storage เมื่ออัปเดต service worker

ผลตรวจในเครื่องพัฒนารอบสุดท้าย: production build และ unit tests 48 ข้อผ่าน; browser smoke ผ่าน 11 scenarios ทั้ง WebGL/software พร้อม screenshot และ pixel assertions รายละเอียดอยู่ในรายงานด้านล่าง ส่วน lint ทั้ง repository ยังมีหนี้เดิมใน component/สคริปต์ที่ไม่ได้ใช้งาน และไม่ได้นับเป็นผ่าน ผลเหล่านี้ไม่ได้ยืนยันว่าได้ deploy ไป Vercel แล้ว

## โครงสร้างและข้อมูลผู้ใช้

อ่าน [รายงานสถาปัตยกรรมและบั๊ก](docs/bug-audit.md) สำหรับเส้นทางการใช้งาน สาเหตุปัญหา ขอบเขตข้อมูล และข้อจำกัดของการทดสอบ

ไม่พบฐานข้อมูลบัญชีผู้ใช้หรือ API เขียนข้อมูลใน checkout นี้ State ของการเลือกประเทศและขั้นงานนำเสนออยู่ใน memory ส่วน service worker เก็บหน้าและ static assets เพื่อใช้ offline การอัปเดตไม่ล้าง localStorage, IndexedDB หรือ cache ของแอปอื่น และเก็บ cache รุ่นก่อนสำหรับแท็บเดิม

ไฟล์ component สินค้า/hero รุ่นก่อนยังเก็บอยู่ใน repository เพื่อรักษางานเดิม แต่ไม่ได้เป็นหน้าแรก การแก้ไขใน checkout ไม่ได้เผยแพร่ไป Vercel โดยอัตโนมัติ
