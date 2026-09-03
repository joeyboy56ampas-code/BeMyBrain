# BeMyBrain

เว็บสมองที่สอง — จดบันทึกความทรงจำ พร้อมล็อกอินด้วย Google จริง และเก็บข้อมูลใน Supabase

## ขั้นตอนติดตั้ง (ทำตามลำดับ)

### 1. เตรียมตาราง Supabase
ไปที่ Supabase Dashboard ของโปรเจกต์คุณ → เมนูซ้าย "SQL Editor" → "New query"
วางโค้ดนี้แล้วกด "Run":

```sql
create table if not exists users (
  email text primary key,
  name text,
  avatar_url text,
  last_login timestamptz
);

create table if not exists brain_data (
  user_email text primary key references users(email),
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz
);
```

### 2. อัปโหลดโค้ดนี้ขึ้น GitHub
1. ไปที่ github.com → กด "+" มุมขวาบน → "New repository"
2. ตั้งชื่อ repo ว่า `bemybrain` แล้วกด "Create repository"
3. ในหน้า repo ที่ว่างเปล่า จะมีลิงก์ "uploading an existing file" กดลิงก์นั้น
4. ลากโฟลเดอร์ทั้งหมด (ทุกไฟล์ในนี้) ไปวางในหน้าเว็บ รอจนอัปโหลดครบ
5. เลื่อนลงล่าง กด "Commit changes"

### 3. Import เข้า Vercel
1. ไปที่ vercel.com → "Add New" → "Project"
2. เลือก repo `bemybrain` → "Import"
3. ก่อนกด Deploy ใส่ Environment Variables ต่อไปนี้ (ค่าที่มี `=` ว่างให้คุณเติมเอง):

```
GOOGLE_CLIENT_ID=<Client ID จาก Google Cloud>
GOOGLE_CLIENT_SECRET=<Client Secret จาก Google Cloud>
NEXT_PUBLIC_SUPABASE_URL=<Project URL จาก Supabase>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon public key จาก Supabase>
NEXTAUTH_SECRET=<สุ่มจาก https://generate-secret.vercel.app/32>
NEXTAUTH_URL=<จะรู้หลัง deploy ครั้งแรก ใส่ทีหลังได้>
```

4. กด "Deploy" รอ 1-2 นาที จะได้ลิงก์เว็บ เช่น `https://bemybrain.vercel.app`

### 4. เติม NEXTAUTH_URL และ Redirect URI
1. กลับไป Vercel → Settings → Environment Variables → เพิ่ม `NEXTAUTH_URL` เป็นลิงก์เว็บที่ได้ (เช่น `https://bemybrain.vercel.app`) → Save → ไปที่ "Deployments" กด "Redeploy" ล่าสุดอีกครั้ง
2. ไปที่ Google Cloud Console → Credentials → เปิด OAuth Client ID ที่สร้างไว้
3. ในช่อง "Authorized redirect URIs" กด "Add URI" ใส่:
   `https://bemybrain.vercel.app/api/auth/callback/google`
4. กด Save

### 5. ทดสอบ
เปิดลิงก์เว็บของคุณ กด "เข้าสู่ระบบด้วย Google" ควรล็อกอินได้จริงและเข้าหน้า dashboard

---
หมายเหตุ: ข้อมูลบันทึกทั้งหมดเก็บใน Supabase ผูกกับอีเมล Google ของแต่ละคน ไม่ได้แชร์ข้ามบัญชี
