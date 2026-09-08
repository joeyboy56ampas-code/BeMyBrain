/**
 * ตัวจัดคิวการบันทึกข้อมูล
 *
 * ปัญหาที่แก้: เดิมทุกครั้งที่ user เปลี่ยนอะไร จะยิง request บันทึกทันที
 * ถ้ากดเซฟหลายอย่างติด ๆ กันเร็ว ๆ จะมี request หลายตัววิ่งพร้อมกัน
 * ตัวที่ 2 ถือ version เก่า (เพราะตัวที่ 1 ยังไม่เสร็จ) เลยโดนระบบกันข้อมูลทับปฏิเสธ
 * แล้วเด้ง "changed on another device" ทั้งที่เป็นเครื่องเดียวกันแท้ ๆ
 *
 * วิธีแก้:
 *   1. ส่งได้ทีละ 1 request เท่านั้น (serialize) — ไม่มีทางชนกันเอง
 *   2. ถ้าระหว่างรอมีการแก้ไขเพิ่ม ให้ทับ state ที่รออยู่ด้วยตัวล่าสุด (coalesce)
 *      เพราะข้อมูลเป็นก้อนเดียว การส่งตัวล่าสุดตัวเดียวก็ครอบคลุมทุกการแก้ไขแล้ว
 *   3. อัปเดต version ต่อเนื่องอัตโนมัติหลังบันทึกสำเร็จแต่ละรอบ
 *
 * ผลลัพธ์: user แก้รัว ๆ ได้เลย ระบบค่อย ๆ ทยอยบันทึกให้เอง
 * และ conflict จริง ๆ จะเหลือแค่กรณีเปิดคนละเครื่องจริงเท่านั้น
 */
export function createSaveQueue({ send, onStatusChange }) {
  let version = null;        // updated_at ล่าสุดที่ server ยืนยันแล้ว
  let pending = null;        // ข้อมูลล่าสุดที่รอส่ง (ถูกทับด้วยตัวใหม่เสมอ)
  let inFlight = false;      // กำลังส่งอยู่หรือไม่
  let lastError = null;

  const emit = () => {
    onStatusChange &&
      onStatusChange({
        saving: inFlight || pending !== null,
        error: lastError,
      });
  };

  async function drain() {
    if (inFlight || pending === null) return;

    inFlight = true;
    const payload = pending;
    pending = null;
    emit();

    const result = await send({ ...payload, baseUpdatedAt: version });

    inFlight = false;

    if (result.ok) {
      version = result.updatedAt;
      lastError = null;
    } else {
      lastError = result.reason;
      // ถ้าเซฟไม่สำเร็จ ทิ้งคิวที่ค้างอยู่ เพราะ state ในมืออาจไม่ตรงกับ server แล้ว
      // ปล่อยให้ user เห็น error แล้วตัดสินใจเอง ดีกว่าดันทุรังเซฟทับข้อมูลที่อาจใหม่กว่า
      pending = null;
    }

    emit();
    drain(); // ถ้ามีตัวใหม่เข้ามาระหว่างรอ ส่งต่อทันที
  }

  return {
    /** ตั้งค่า version เริ่มต้นตอนโหลดข้อมูลครั้งแรก */
    setVersion(v) {
      version = v;
    },
    /** สั่งบันทึก — เรียกถี่แค่ไหนก็ได้ ระบบจัดคิวให้เอง */
    enqueue(data) {
      pending = data;
      lastError = null;
      emit();
      drain();
    },
    /** ล้าง error หลัง user รับทราบแล้ว */
    clearError() {
      lastError = null;
      emit();
    },
  };
}
