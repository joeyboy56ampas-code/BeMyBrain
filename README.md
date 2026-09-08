# BeMyBrain

เว็บสมองที่สอง — จดบันทึกความทรงจำ พร้อมล็อกอินด้วย Google หรือ ชื่อผู้ใช้/รหัสผ่าน

## สิ่งที่เปลี่ยนไปจากเวอร์ชันแรก
- เพิ่มการล็อกอินด้วย username/password (มีหน้าสมัครสมาชิกแยก) นอกเหนือจาก Google
- ย้ายการอ่าน/บันทึกข้อมูลไปทำฝั่งเซิร์ฟเวอร์ทั้งหมด (ผ่าน `/api/data`) แทนที่จะเรียก Supabase ตรงจากเบราว์เซอร์ — ปลอดภัยกว่ามาก และแก้ปัญหาข้อมูลไม่ถูกบันทึก
- ใช้ Supabase **service_role key** (สิทธิ์เต็ม ฝั่งเซิร์ฟเวอร์เท่านั้น) แทน anon key ที่เคยฝังในโค้ดฝั่งเบราว์เซอร์
- **ต้องลงทะเบียนก่อนเข้าใช้งานเสมอ** ทั้งสองช่องทาง: ล็อกอินด้วย Google ก็ใช้ไม่ได้ถ้ายังไม่เคยสมัคร — ระบบจะเด้งไปหน้าสมัครให้อัตโนมัติพร้อมยืนยันอีเมลนั้นให้เลย (ด้วยโทเค็นที่เซ็นด้วย NEXTAUTH_SECRET ปลอมแปลงไม่ได้) การสมัครสมาชิกบังคับให้เชื่อมต่อ Gmail จริงเสมอ ก่อนตั้งชื่อผู้ใช้/รหัสผ่าน

## ขั้นตอนติดตั้ง

### 1. อัปเดตตาราง Supabase
ไปที่ Supabase Dashboard → SQL Editor → New query แล้วรันคำสั่งนี้ (ถ้าเคยรันเวอร์ชันเก่าไปแล้ว รันซ้ำได้ ไม่มีผลเสีย):

```sql
create table if not exists users (
  email text primary key,
  username text unique,
  name text,
  avatar_url text,
  password_hash text,
  last_login timestamptz
);

-- ถ้าตาราง users มีอยู่แล้วจากเวอร์ชันก่อน ให้รันสองบรรทัดนี้เพิ่ม
alter table users add column if not exists username text unique;
alter table users add column if not exists password_hash text;

create table if not exists brain_data (
  user_email text primary key references users(email),
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz
);
```

### 2. เตรียม Environment Variables
ตอนนี้ต้องใช้ **service_role key** แทน anon key:
1. ไปที่ Supabase → Project Settings → API
2. คัดลอกค่าในช่อง **"service_role"** (ไม่ใช่ "anon public" แบบเดิม — สังเกตคำเตือนสีแดงว่าเป็นคีย์ลับ)
3. ตั้งชื่อตัวแปรใน Vercel ว่า `SUPABASE_SERVICE_ROLE_KEY`

ตัวแปรทั้งหมดที่ต้องมีใน Vercel → Settings → Environment Variables:

```
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
NEXT_PUBLIC_SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
NEXTAUTH_SECRET=...
NEXTAUTH_URL=https://<ลิงก์เว็บของคุณ>
ADMIN_EMAILS=<อีเมล Gmail จริงของคุณ ที่จะให้มีสิทธิ์เข้าหน้า /admin (ไม่บังคับถ้าใช้ ADMIN_PASSWORD แทน)>
ADMIN_PASSWORD=<รหัสผ่านที่คุณตั้งเอง สำหรับเข้าหน้า /admin แบบเร็ว ไม่ต้องผ่านบัญชี Google>
```

ใช้ได้ทั้ง 2 แบบพร้อมกัน หรือแบบใดแบบหนึ่งก็ได้:
- `ADMIN_EMAILS` — ล็อกอินด้วยบัญชี Google/username ปกติที่อยู่ใน allowlist นี้ แล้วเข้า `/admin` ได้ทันที (ผูกกับตัวตนจริง)
- `ADMIN_PASSWORD` — เข้าที่**หน้า login ปกติ** (`/login`) ใส่ username เป็น `admin` และรหัสผ่านตามที่ตั้งไว้ในนี้ ระบบจะพาไปหน้า `/admin` ให้อัตโนมัติ **รหัสนี้ตั้งไว้ใน Environment Variables ของ Vercel เท่านั้น ไม่เคยอยู่ในโค้ดหรือ GitHub repo เลย** และ username "admin" ถูกกันไว้ ผู้ใช้ทั่วไปสมัครซ้ำด้วยชื่อนี้ไม่ได้

ถ้ามีมากกว่า 1 คนใน ADMIN_EMAILS คั่นด้วย comma เช่น `ADMIN_EMAILS=you@gmail.com,partner@gmail.com`

ลบตัวแปร `NEXT_PUBLIC_SUPABASE_ANON_KEY` เก่าออกได้เลยถ้ามีอยู่ ไม่ใช้แล้ว

### 3. อัปโหลดขึ้น GitHub
แนะนำให้ใช้ **GitHub Desktop** (ก็อปไฟล์ทั้งหมดทับลงในโฟลเดอร์ local repo เดิม แล้ว commit + push) แม่นยำกว่าการลากอัปโหลดผ่านเว็บ

### 4. Deploy
Vercel จะ deploy ให้อัตโนมัติเมื่อ push ขึ้น GitHub (auto-deploy) ไม่ต้องกดอะไรเพิ่ม

---
หมายเหตุด้านความปลอดภัย: รหัสผ่านที่ผู้ใช้ตั้งจะถูกเข้ารหัสด้วย bcrypt ก่อนบันทึกเสมอ ไม่มีการเก็บรหัสผ่านตัวจริงไว้ที่ไหนเลย
