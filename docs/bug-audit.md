> รายงานนี้บันทึกการตรวจรอบก่อนหน้า ดูการแก้เครื่องบิน การซูมประเทศ และผลตรวจล่าสุดที่ [navigation-audit.md](navigation-audit.md)

# รายงานทำความเข้าใจระบบและตรวจบั๊ก NFTE

เอกสารนี้อธิบายโครงสร้างและพฤติกรรมที่ตรวจพบใน repository `chomms-official/NFTE` รวมถึงเหตุผลของการแก้ไข เพื่อให้ตรวจทานได้ก่อนนำไปใช้งานจริง การอ่านโค้ดและการทดสอบในเครื่องพัฒนาช่วยยืนยันกรณีที่ตรวจแล้ว แต่ไม่ใช่การรับประกันว่าไม่มีบั๊กเหลือในอุปกรณ์และเครือข่ายทุกแบบ

## 1. ขอบเขตหลักฐาน

- ตรวจโค้ดทุก route ที่มีอยู่จริง รวมถึง component ที่ route เหล่านั้นเรียกใช้, styles, service worker, metadata, manifest, proxy และการตั้งค่า build
- ภาพจากผู้ใช้แสดง React error #418 และการสร้าง WebGL context ไม่สำเร็จ ข้อความ `GL_VENDOR = Disabled` / `GL_RENDERER = Disabled` เป็นหลักฐานว่ากราฟิกของเบราว์เซอร์ในภาพใช้งานไม่ได้ในขณะนั้น ไม่ใช่หลักฐานว่าเซิร์ฟเวอร์ล่ม
- การเข้าถึงเว็บ Vercel จริงจากสภาพแวดล้อมตรวจสอบถูกตอบกลับ HTTP 403 จึงยังเปรียบเทียบ deployment จริงกับ checkout นี้โดยตรงไม่ได้ การแก้และการทดสอบอ้างอิง checkout และเครื่องทดสอบเป็นหลัก
- ไม่ได้อ่านหรือแก้ข้อมูลในบัญชีผู้ใช้จริง ไม่ได้เชื่อมฐานข้อมูล production และไม่ได้เผยแพร่การแก้ไขไป Vercel ระหว่างการตรวจ
- ผลตรวจเบราว์เซอร์/build ชุดสุดท้ายควรอ่านร่วมกับผลที่รายงานตอนส่งงาน เอกสารนี้แยกข้อค้นพบจากโค้ดออกจากผลทดสอบที่ดำเนินการแล้ว

## 2. ระบบนี้คืออะไร

นี่เป็นเว็บ Next.js App Router ใช้ React 19 และ TypeScript งานหลักคือ MozzieMap ลูกโลกจำลองความเสี่ยงจากยุง และมีงานนำเสนอ SENT SCENT เป็นอีก route ภายใน repository ยังมี component ผลิตภัณฑ์ Chomm’s House จากงานเดิม แต่ไม่ใช่หน้าแรกตามข้อกำหนดล่าสุด ไม่พบระบบสมาชิก ตะกร้าสินค้า การชำระเงิน API เขียนข้อมูล หรือฐานข้อมูลใน checkout นี้

| Route | จุดเริ่มต้น | Component หลัก | หน้าที่ |
| --- | --- | --- | --- |
| `/` | `src/app/page.tsx` | `OutbreakGlobe`, `ContributionSkyline` | หน้าแรก MozzieMap: ลูกโลก เลือกชนิดยุงและประเทศ ดูความเสี่ยงจำลอง |
| `/sent-scent` | `src/app/sent-scent/page.tsx` | `InfiniteScrollPresentation`, `SentScentLogo` | งานนำเสนอรูปภาพห้าขั้นแบบวนลูป |
| `/simulator` | `src/app/simulator/page.tsx` | `OutbreakGlobe`, `ContributionSkyline` | เส้นทางเดิมที่ยังเปิดหน้าลูกโลกเดียวกันได้ |

ทั้งสามหน้าใช้ `src/app/layout.tsx` ร่วมกัน ซึ่งโหลดฟอนต์และ global CSS กำหนด metadata/ไอคอน/PWA manifest และลงทะเบียน service worker ส่วน layout ของ `/sent-scent` เปลี่ยนชื่อหน้าเป็น SENT SCENT

เทคโนโลยีที่มีหน้าที่ต่างกัน:

- React Three Fiber เป็นตัวเชื่อม React กับ Three.js ในหน้าผลิตภัณฑ์
- Drei ให้กล้อง เงา แสง particles และเครื่องมือกราฟิก
- `react-globe.gl` สร้างลูกโลกใน simulator โดยโหลดเฉพาะฝั่งเบราว์เซอร์
- `ContributionSkyline` ใช้ Canvas 2D วาดกราฟที่มีลักษณะมิติ สามารถแสดงข้อมูลได้โดยไม่ต้องสร้าง WebGL renderer อีกตัว
- Framer Motion จัด transition ของงานนำเสนอ SENT SCENT
- Tailwind และ CSS ใน `globals.css` กำหนด layout และ responsive styles

## 3. เส้นทางการใช้งานหน้าแรก `/`

หน้าแรกต้องเป็น MozzieMap และ render `OutbreakGlobe` โดยตรงเหมือน `/simulator` ไม่ใช่หน้าแสดงสินค้า ไม่มีการ์ดผลิตภัณฑ์ 11 ขั้น ไม่มีภาพซอง/ขวดสเปรย์ และไม่ใช้รูปสินค้าเป็น fallback เมื่อ GPU ใช้งานไม่ได้

1. ผู้ใช้เห็นลูกโลกพร้อมผิวประเทศและคะแนนสีของชนิดยุงที่เลือก
2. หมุน/ลากหรือซูมลูกโลกเพื่อสำรวจพื้นที่ เปลี่ยนชนิดยุงจากแถบควบคุม
3. คลิกประเทศ หรือใช้ตัวเลือกประเทศที่เข้าถึงได้ด้วยคีย์บอร์ด เพื่อเปิดรายละเอียด
4. อ่านคะแนนและกราฟจำลอง เปลี่ยนมุมมองกราฟ ปิดรายละเอียดกลับไปสำรวจต่อ
5. เปิด/ปิด autopilot เพื่อให้ระบบเลือกประเทศตัวอย่างอัตโนมัติ

มี renderer สองแบบที่ใช้ชุดประเทศและคะแนนเดียวกัน:

- **WebGL:** `react-globe.gl` ใช้ GPU ผ่าน Three.js สำหรับลูกโลกปกติ
- **Software globe:** `SoftwareGlobe` ใช้ Canvas 2D และการฉายแบบ orthographic วาดโลกทรงกลมพร้อมผืนประเทศ เส้นขอบ เงา และจุด hotspot สามารถลาก หมุน ซูม คลิกประเทศ และใช้ปุ่มควบคุม/คีย์บอร์ดได้ เมื่อ WebGL ถูกปิดหรือ context สูญหายจะเปลี่ยนมาใช้เส้นทางนี้

Canvas 2D นี้ยังแสดงลูกโลกทรงกลมและข้อมูลจริงชุดเดียวกับ renderer หลักในเชิงโครงสร้างของแอป ไม่ใช่ภาพ placeholder หรือแผนที่สี่เหลี่ยมแบน และไม่ได้ทำให้ข้อมูลจำลองกลายเป็นข้อมูลเฝ้าระวังจริง การแสดงผลอาจมีลักษณะแสง/พื้นผิวต่างจาก WebGL เพื่อให้ทำงานได้โดยไม่ใช้ GPU

### ขอบเขตของหน้า product ที่เคยอยู่ใน checkout

ก่อนแก้ หน้า `/` ใน checkout เรียก `ChommsHouse3DHero` และเรื่องราวสินค้า 11 ขั้น ตั้งแต่เปิดซอง ละลายฟิล์ม เทใส่ขวด จนถึงใช้งาน ซึ่งไม่ตรงกับความต้องการล่าสุดที่ให้หน้าแรกเป็น MozzieMap จึงแก้ route กลับเป็นลูกโลกแทนการใช้หน้าสินค้าแก้ขัด โค้ดเก่าถูกเก็บไว้ ไม่ได้ลบสินทรัพย์หรือข้อมูลออกจาก repository

บั๊ก nested paragraph, literal text ใน R3F และ material state ใน component สินค้าที่พบระหว่างการตรวจแรกถูกแยกไว้ในตารางด้านล่างเพื่อแสดงร่องรอยวินิจฉัย แต่ไม่ควรสับสนว่า component นั้นยังเป็นหน้าหลักที่ผู้ใช้ต้องใช้งาน

## 4. เส้นทางการใช้งาน `/sent-scent`

หน้านี้มีข้อมูลคงที่ห้าขั้น: Earl Grey Garden, Natural Shell, Stable Powder, Dissolve & Pour และ Ready to Use ใช้รูปใน `public/presentation/` และรูปสเปรย์ที่มีอยู่แล้วใน `public/`

- เริ่มที่ภาพขนาดเล็กพร้อมชื่อขั้นและพื้นหลังเบลอ
- หมุนล้อเมาส์หรือเลื่อนนิ้วเพื่อเพิ่ม progress ภาพจะขยาย ข้อความชื่อเลื่อนออกด้านข้าง และคำอธิบายปรากฏ
- ช่วงท้ายของขั้นค่อย ๆ ลดความทึบ จากนั้นไปขั้นถัดไป เมื่อจบขั้นที่ห้าจะวนกลับขั้นแรก
- เลื่อนกลับก่อนต้นขั้นจะย้อนกลับขั้นก่อนหน้า
- ไม่ใช้งานห้าวินาทีจะเล่นเองตามเดิม การแก้ใช้เวลาเป็นฐานแทนจำนวนเฟรม เพื่อไม่ให้จอ refresh rate สูงทำงานเร็วผิดปกติ
- เพิ่มคีย์ลูกศร, Page Up/Down, Home/End และ Space/Shift+Space เพื่อไปขั้นก่อน/ถัดไป โดยไม่ดักปุ่มของ input, link, button หรือ contenteditable
- การซูมด้วย Ctrl/Meta + wheel และ multi-touch ไม่ถูกยึดมาใช้เป็นการเปลี่ยนขั้น
- reduced motion ปิด autoplay; การกลับมาจากแท็บอื่นเริ่มช่วงรอก่อนเล่นเองใหม่

ข้อมูลขั้น/รูปและ progress อยู่ใน React state เท่านั้น การเปลี่ยน state ไม่ได้บันทึกหรือเขียนทับข้อมูลถาวรของผู้ใช้

## 5. การทำงานของลูกโลกที่ `/` และ `/simulator`

### 5.1 การเริ่มต้นและทรัพยากร

`OutbreakGlobe` โหลดประเทศจาก `/assets/countries.geojson` และภาพผิวโลก/พื้นหลังท้องฟ้าจาก `public/assets/` หลัง mount จึงโหลด component ลูกโลกที่ต้องใช้ browser API เมื่อดาวน์โหลดประเทศสำเร็จ จะนำ geometry มาทำ polygon บนโลกและผูกข้อมูลจำลองเข้าแต่ละประเทศ

การแก้เพิ่มสถานะ loading/ready/error ตรวจ HTTP response และโครงสร้างข้อมูลก่อนใช้ พร้อมปุ่มลองใหม่ ยกเลิก request เก่าเมื่อ retry หรือ unmount เพื่อลด race condition

### 5.2 การเลือกชนิดยุงและประเทศ

มีสามตัวเลือก: Aedes, Anopheles และ Culex แต่ละชนิดมีรายชื่อโรค คะแนนความเสี่ยงที่กำหนดในโค้ด และจุด hotspot ของตัวเอง สีแดง/ส้ม/เหลืองแสดงช่วงคะแนน ผู้ใช้สามารถ hover ดูข้อมูลย่อ เลือกประเทศ และเปิดรายละเอียดประเทศพร้อมกราฟย้อนหลังจำลอง

การเลือกประเทศบนลูกโลกมีการขยับกล้อง เครื่องบิน และเส้นทางบิน จากนั้นแสดงรายละเอียด การเลือกด้วยตนเองหยุด autopilot ส่วน autopilot จะวนประเทศตัวอย่างและสลับชนิดยุง การเริ่มทัวร์ต้องรอ renderer พร้อม ไม่ควรอาศัยเพียงว่ามี DOM หรือดาวน์โหลด JSON แล้ว

เมื่อ WebGL ใช้ไม่ได้ หน้าเปลี่ยนเป็น software globe ทรงกลมที่ยังลาก ซูม คลิกประเทศ เลือกชนิดยุง และอ่านรายละเอียด/กราฟจำลองได้ มีตัวเลือกประเทศ HTML เป็นเส้นทางเข้าถึงเพิ่มเติมสำหรับ renderer ทั้งสองแบบ ไม่ใช่การแทนลูกโลกด้วย dropdown อย่างเดียว ปุ่ม autopilot รอให้ renderer ที่ใช้งานจริงและข้อมูลประเทศพร้อม ไม่จำเป็นต้องมี WebGL เสมอไป

### 5.3 ความหมายของข้อมูล

คะแนน รายชื่อ hotspots และจำนวนรายวันเป็น input/ผลลัพธ์ของแบบจำลองที่อยู่ในโค้ด ไม่ใช่การดึงรายงานเฝ้าระวังจาก WHO/CDC แบบสด ลิงก์ WHO/CDC เป็นเอกสารให้ความรู้เรื่องโรค ไม่ใช่ endpoint ของข้อมูลที่นำมาพล็อต การแก้ทำข้อความนี้ให้ชัดในหน้า

การคำนวณใหม่ใช้ helper กลางเพื่อให้สีบนแผนที่ tooltip และรายละเอียดใช้คะแนนเดียวกัน ประวัติจำลองใช้ seed จากชื่อประเทศและชนิดยุง แทนการสุ่มใหม่ทุกครั้งที่ render ส่วนพิกัดประเทศใช้ metadata ถ้ามี หรือหาตำแหน่งตัวแทนจาก polygon โดยจัดการเส้นวันที่สากลและหลายเกาะ ไม่ใช้ vertex แรกเป็นศูนย์กลางประเทศ

ยังไม่ควรใช้คะแนน/กราฟนี้เป็นหลักฐานทางระบาดวิทยา การตัดสินใจทางการแพทย์ หรือคำพยากรณ์จริง การเชื่อมข้อมูลเฝ้าระวังจริงเป็นงานแยกต่างหากที่ต้องระบุแหล่งข้อมูล สิทธิใช้งาน วันปรับปรุง และวิธีประมวลผล

## 6. ขอบเขตข้อมูลและการเก็บข้อมูล

| ข้อมูล/ทรัพยากร | แหล่งที่มา | ที่เก็บ/อายุ |
| --- | --- | --- |
| ข้อความผลิตภัณฑ์และ SENT SCENT | source code | ไฟล์ใน repository |
| รูปภาพ/GeoJSON/ไอคอน | `public/` | ไฟล์ใน repository และ browser asset cache |
| ขั้นปัจจุบัน/ประเทศ/ชนิดยุง/เปิดรายละเอียด | การโต้ตอบของผู้ใช้ | React state; ไม่ใช่ข้อมูลบัญชี |
| ประวัติรายวันจำลอง | ฟังก์ชัน generate + seed | คำนวณใน browser memory |
| หน้าและ static assets สำหรับ offline | service worker | CacheStorage ชื่อ `mozziemap-cache-v*` |

ไม่พบการใช้ localStorage, sessionStorage, IndexedDB, cookie สำหรับบันทึกข้อมูลผู้ใช้ หรือ route ที่เขียนฐานข้อมูลในส่วนที่ตรวจ ทั้งนี้การไม่พบใน checkout นี้ไม่ได้ยืนยันว่าไม่มีข้อมูลในระบบภายนอกหรือ deployment อื่น

service worker รุ่นเดิมลบ CacheStorage ทุกชื่อที่ไม่ใช่เวอร์ชันปัจจุบัน ซึ่งอาจกระทบ cache ของแอปอื่นบน origin เดียวกัน และทำให้แท็บที่เปิดเวอร์ชันเก่าขาด bundle การแก้ไม่ลบ cache เก่าและไม่ล้างที่เก็บข้อมูลของผู้ใช้ ค้นหา offline fallback เฉพาะ cache ของแอปเองเท่านั้น

การคง cache เวอร์ชันเก่าช่วยรักษาแท็บเดิมและ offline assets แต่มี tradeoff ด้านพื้นที่จัดเก็บ ไม่ควรเพิ่มการล้าง storage แบบเหมาในภายหลัง หากต้องการจำกัดขนาดควรออกแบบ retention ที่แยก cache ของแอป ตรวจอายุ/เวอร์ชัน และไม่ลบข้อมูลผู้ใช้

## 7. บั๊กที่วินิจฉัยและแนวแก้

| ปัญหา | ตัวกระตุ้นและผลกระทบ | แนวแก้ในชุดนี้ |
| --- | --- | --- |
| DOM ไม่ตรงระหว่าง SSR กับ client | subtitle เป็น `<p>` แต่ hero ห่อด้วย `<p>` อีกครั้ง Browser แก้ nested paragraph ทำให้ hydration mismatch | เปลี่ยน wrapper เป็น element ที่รับเนื้อหาได้โดยไม่สร้าง nested paragraph |
| WebGL failure ล้มทั้งหน้า | GPU/WebGL ถูกปิด driver/context ล้ม หรือ renderer สร้างไม่สำเร็จ | ตรวจ WebGL2 หลัง mount, error boundary และ context-loss handler; เปลี่ยนเป็น software globe ทรงกลมที่โต้ตอบได้ |
| ข้อความ `\\n` ใน scene tree | literal text ตกค้างระหว่าง mesh/material/Outlines | นำตัวอักษรตกค้างออก ไม่ส่ง text node เข้า R3F |
| ขึ้นกับ HDR ภายนอก | Environment preset ดาวน์โหลดไฟล์จากภายนอก หากล้มเหลว scene ค้างหรือ error | ลด dependency ภายนอกที่เป็นจุดล้มเหลวของฉาก |
| ฟอนต์ Google ทำ build ล้มเมื่อ egress ถูกปิด | compile ต้องขอฟอนต์จาก Google Fonts | เก็บฟอนต์ที่ได้รับมาจากแหล่งที่ตรวจสอบได้และใช้ `next/font/local` |
| middleware และ static export ขัดกัน | configuration ใช้ `output: export` แต่ต้องการ host rewrite/runtime | ใช้ Next runtime ที่รองรับ proxy; เปลี่ยน convention เป็น `src/proxy.ts` |
| rewrite ไป route ที่ไม่มี | host มี `sentscent` แต่ rewrite ไป `/presentation` | ชี้ไป `/sent-scent` ที่มีอยู่จริง |
| ขั้น SENT SCENT ข้ามซ้ำ | enqueue `setCurrentStepIndex` ภายใน `setScrollProgress` updater ที่ React อาจ replay | รวม index/progress ใน state เดียว และใช้ pure helper |
| touch ตำแหน่งศูนย์ไม่ทำงาน/ผูก listener บ่อย | ใช้ `0` เป็นทั้งค่าพิกัดและ sentinel; effect ขึ้นกับ touch state | ใช้ ref ที่แยก `null` ออกจากพิกัดจริง |
| autoplay ไม่คงที่/ไม่เคารพผู้ใช้ | เดิน progress ตามเฟรมและไม่สน hidden/reduced motion | ใช้เวลาที่ผ่านไปและตรวจ accessibility/visibility |
| สี/คะแนน/กราฟ simulator ไม่ตรงกัน | fallback score และ random ถูกคำนวณคนละจุดหรือทุก render | helper กลางและ seed ที่เสถียร |
| กล้องไปตำแหน่งผิดประเทศ | ใช้ coordinate แรกเมื่อ metadata ไม่มี | หาตำแหน่งตัวแทน polygon และ unwrap longitude |
| ภูมิศาสตร์โหลดล้มแล้วไม่มีทางออก | fetch ไม่มีสถานะ error/retry/abort | ตรวจข้อมูล แสดง error พร้อม retry และยกเลิก request เก่า |
| timer/animation/resource ค้าง | เปลี่ยนประเทศ ปิดหน้า หรือ context หายระหว่างบิน | ยกเลิก animation/timer และ dispose resource ที่ component สร้าง |
| service worker ผสมเนื้อหา/เก็บเกินขอบเขต | cache HTML, RSC, query, cross-origin หรือ response ที่ไม่ควร cache แบบเดียวกัน | จำกัด same-origin page/static assets, ข้าม RSC/auth/query/no-store, ไม่เก็บ error/private response |
| storage เต็มทำ fetch ล้ม | cache write throw หลัง network สำเร็จ | แยก cache failure ออกจาก network response และรอ write ด้วย lifetime ที่ถูกต้อง |
| offline request ไม่มี response | cache miss แล้วคืน undefined | ตอบ 503 ที่อธิบายว่าต้องเชื่อมต่อใหม่ |
| progress bar หน้าแรกไม่แสดง | span ไม่มี class ที่ CSS ใช้กำหนด display/height | ใช้ `.ch-progress-fill` |
| วัตถุค้างเมื่อเลื่อนย้อน | state ของ material/transform ถูกกำหนดบางช่วงและไม่คืนค่าในช่วงอื่น | กำหนด visibility/transparency/transform ให้ย้อนกลับได้ |

การอ่านโค้ดพิสูจน์สาเหตุเชิงโครงสร้างได้ แต่การยืนยันผล UI ต้องรันทดสอบเบราว์เซอร์ร่วมด้วย โดยเฉพาะ WebGL, hydration, การเลื่อนย้อน และกรณีอุปกรณ์ไม่รองรับ GPU

## 8. Component เดิมที่ไม่ได้ถูกใช้งาน

`chomms-house-3d-hero.tsx`, `cinematic-scroll-hero.tsx`, `interactive-product-journey.tsx`, `horizon-hero-section.tsx` และ `scroll-expansion-hero.tsx` ยังอยู่ใน repository แต่ไม่มี route/component ที่ใช้งานจริง import เข้ามาใน graph ปัจจุบัน จึงไม่ได้เป็นสาเหตุ runtime ของสามหน้าที่มีอยู่

พบข้อควรระวังในโค้ดเดิม เช่น random ใน render ของ interactive journey, touch sentinel/listener churn ใน scroll expansion, dummy hash links และการจัดการ lifecycle ของฉาก/animation ใน horizon อย่างไรก็ตามการแก้ component ที่ไม่มีผู้ใช้ใน graph ตอนนี้จะเพิ่มขอบเขตและความเสี่ยงโดยไม่ได้แก้ปัญหาหน้าเว็บที่รายงาน จึงเก็บไว้และระบุเป็นหนี้เทคนิคสำหรับการนำกลับมาใช้ในอนาคต

สคริปต์ `scripts/fix-*.js` และสคริปต์แก้โค้ดอื่นเป็นเครื่องมือเปลี่ยน source ไม่ใช่คำสั่งตั้งค่าหรือทดสอบ ไม่ได้รันสคริปต์เหล่านั้นแบบเหมา เพราะอาจเขียนทับการแก้ไขหรือสร้าง artifact ซ้ำ

## 9. การทดสอบและข้อจำกัด

ผลตรวจรวมที่มีหลักฐานแล้ว:

| การตรวจ | ผล |
| --- | --- |
| ติดตั้งซ้ำด้วย `npm ci` โดยใช้ lockfile | ผ่านตามผลรวมของผู้รวมงาน |
| Production build | ผ่านจาก source รอบสุดท้ายหลังแก้หน้าแรก ลูกโลก input และข้อความกราฟ |
| `npm test` | ผ่าน 48 tests ตามผลรวมล่าสุดของผู้รวมงาน |
| `npm run test:browser` | ผ่าน 11 scenarios บน production build ที่หน้าแรกเป็นลูกโลกแล้ว |
| ESLint ของ browser harness ที่ปรับ | ผ่าน |
| `npm run lint` ทั้ง repository | ยังมีปัญหาเดิมใน source/สคริปต์ legacy; ไม่ได้นับเป็นผ่าน |

Chromium ใช้ viewport desktop 1440×900 และ mobile 390×844 โดยมีสองโหมดคือ WebGL ผ่าน SwiftShader และปิด WebGL เพื่อทดสอบ software globe:

1. หน้าแรก software: ลูกโลกทรงกลมจริง ไม่มีภาพ/การ์ดสินค้า ตรวจ pixel/silhouette คลิกประเทศตรงกลาง ลากหมุนและซูม
2. หน้าแรก software: เลือกประเทศ เปลี่ยนยุง สลับมุมกราฟ เปิดซ้ำแล้วคะแนนคงเดิม และเปิด/หยุด autopilot
3. `/simulator` software: เส้นทางเดิมยังเป็นลูกโลกและเลือกประเทศได้
4. บังคับ GeoJSON ตอบ 503 แล้ว retry โหลดกลับได้โดยไม่มี JavaScript exception
5. Mobile: ลูกโลกทรงกลม เลือก Japan เปิด/ปิดรายละเอียด และไม่มี horizontal overflow
6. SENT SCENT: keyboard ไปครบห้าขั้นและวนหน้า/ย้อน, wheel, touch เริ่มพิกัดศูนย์ และ reduced-motion ไม่เล่นเองหลัง idle
7. Service worker: เก็บ draft ทดสอบใน localStorage และ cache ชื่ออื่น อัปเดต worker ตรวจข้อมูลยังอยู่ แล้ว reload หน้าแรก offline ยังแสดงลูกโลกและเลือกประเทศได้
8. หน้าแรก WebGL: ตรวจ WebGL2 context และภาพที่ render จริง ลากหมุนและซูม
9. หน้าแรก WebGL: ประเทศ/ชนิดยุง/กราฟ/คะแนนคงเดิม/autopilot
10. สั่ง GPU context loss จริง แล้วกลับเป็น software globe ทรงกลมที่เลือกประเทศ ลากและซูมได้
11. `/simulator` WebGL: เส้นทางเดิมและรายละเอียดประเทศทำงาน

ตัวอย่างหลักฐานระดับ pixel: software globe มี land pixels 114,990 จุดภายในวงกลมและ 0 จุดนอกวงกลมในภาพที่ตรวจ การลากเปลี่ยนภาพ 176,678 pixels ในกรณี software จึงไม่ได้ใช้เพียงว่ามี `<canvas>` หรือ HTTP 200 เป็นหลักฐาน ตรวจ screenshot จริงของทั้ง desktop/mobile แล้วเห็นลูกโลก ผืนประเทศ เส้นขอบและ heatmap ไม่มีภาพสินค้า

ไม่พบ JavaScript exception หรือ console error ที่ไม่คาดหมายใน 11 scenarios; response 503 ใน test retry และ offline network failures เป็นเหตุการณ์ที่ตั้งใจจำลอง ไม่ใช่ผลตรวจผ่านของ endpoint ที่ล้มเหลว การทดสอบใช้ browser profile ชั่วคราว ไม่ได้เปิดหรือล้าง profile ของผู้ใช้จริง

ทดสอบ browser ทั้ง 11 scenarios ซ้ำบน production build รอบสุดท้ายหลังปรับตำแหน่งประเทศข้าง panel, ไม่ดัก Ctrl/Meta-wheel สำหรับ browser zoom และ wrap หน่วย “simulated cases” แล้วผ่านทั้งหมด Harness ตรวจความกว้างข้อความว่าต้อง fit หรือ wrap และรอ transition 500ms ก่อน screenshot; ตรวจภาพประเทศ Thailand/Japan จริงแล้วข้อความหน่วยไม่ถูกตัด และประเทศที่เลือกบน desktop ยังอยู่ข้าง panel

หลักฐานรอบ browser อยู่ใน `/tmp/nfte-globe-results/results.json` พร้อมภาพใน directory เดียวกัน log อยู่ที่ `/tmp/nfte-qa/globe-browser.log` ตำแหน่ง `/tmp` อาจหายเมื่อเริ่มสภาพแวดล้อมใหม่ ไม่ใช่ URL ของเว็บที่ deploy แล้ว

baseline ก่อนแก้มี lint 68 errors/22 warnings และ build ถูกบล็อก Google Fonts การแก้ครั้งนี้ไม่ปิดกฎ lint หรือเขียนทับสคริปต์แก้ source รุ่นเก่าแบบเหมา ผล lint ล่าสุดทั้ง repository ยังไม่ผ่าน (54 errors/20 warnings) ซึ่งเป็นหนี้เดิมในสคริปต์และ component ที่ไม่ได้ใช้งาน ต้องแยกจากไฟล์ใหม่ที่ตรวจผ่านและ runtime tests

ข้อจำกัดที่ยังต้องระวัง:

- ไม่สามารถรับรองอุปกรณ์ทุกชนิดหรือรับประกันไม่มีบั๊กแบบเด็ดขาดได้ จึงต้องรายงานขอบเขตทดสอบจริงและมี fallback
- การทดสอบ GPU ใน container อาจใช้ software rendering ซึ่งไม่แทน driver/นโยบายของ Chrome ในเครื่องผู้ใช้ทั้งหมด
- ไม่ได้อัปเกรดข้อมูลจำลองให้เป็นข้อมูลโรคระบาดจริง
- ไม่ได้ตรวจ deployment จริงผ่าน HTTP ที่ถูกบล็อก และยังไม่ยืนยันว่าไฟล์แก้ไขเผยแพร่ไป production แล้ว
- metadata และ manifest ใช้ MozzieMap เป็นค่ากลาง และ layout ของ `/sent-scent` เปลี่ยนชื่อหน้าเฉพาะส่วน การเปลี่ยนแบรนด์หรือเนื้อหาสินค้าเป็นงานแยกจากการแก้ลูกโลก
- การปล่อยขึ้นจริงควรทดสอบ smoke หลัง deployment อีกครั้ง โดยเปิดทั้งแท็บใหม่และแท็บที่มี service worker รุ่นก่อน พร้อมเก็บ deployment ก่อนหน้าไว้สำหรับ rollback
