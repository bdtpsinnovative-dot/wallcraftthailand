'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';

const CENTRAL_SUPABASE_URL =
  process.env.NEXT_PUBLIC_CENTRAL_SUPABASE_URL || 'https://gshppxgvdrmbfcxsxeph.supabase.co';
const CENTRAL_SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_CENTRAL_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdzaHBweGd2ZHJtYmZjeHN4ZXBoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIwMjQzODAsImV4cCI6MjEwNzYwMDM4MH0.lhpLOeb7oY0e-ZCIgSBgzHfPAgAzK8eqFgUPg9te8XM';

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    message: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);

    try {
      if (!formData.name.trim()) {
        setErrorMsg('กรุณากรอกชื่อผู้ติดต่อ');
        setSubmitting(false);
        return;
      }
      if (!formData.phone.trim() && !formData.email.trim()) {
        setErrorMsg('กรุณากรอกเบอร์โทรหรืออีเมล');
        setSubmitting(false);
        return;
      }

      const nameParts = formData.name.trim().split(/\s+/);
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(' ') || '-';

      const supabase = createClient(CENTRAL_SUPABASE_URL, CENTRAL_SUPABASE_ANON_KEY);
      const { error: insertError } = await supabase
        .from('contact_inquiries')
        .insert({
          first_name: firstName,
          last_name: lastName,
          phone: formData.phone.trim(),
          email: formData.email.trim(),
          message: formData.message.trim(),
          source: 'wallcraft',
          status: 'new',
        });

      if (insertError) {
        console.error('Supabase insert error:', insertError);
        setErrorMsg('เกิดข้อผิดพลาดในการส่งข้อความ กรุณาลองใหม่อีกครั้ง');
      } else {
        setSubmitted(true);
        setFormData({ name: '', email: '', phone: '', message: '' });
      }
    } catch (err: any) {
      console.error('Network error submitting contact inquiry:', err);
      setErrorMsg('ไม่สามารถเชื่อมต่อได้ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-[#0a0a0a] min-h-screen text-white pt-28 pb-20 px-6 sm:px-10 lg:px-16 font-['Prompt',sans-serif]">
      <div className="max-w-4xl mx-auto">
        {/* Header Title */}
        <div className="text-center mb-12 md:mb-16">
          <p className="text-[#c6a87c] text-xs uppercase tracking-[0.3em] mb-2 font-medium">
            Get In Touch
          </p>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-['Playfair_Display'] uppercase tracking-wider text-white">
            ติดต่อเรา Wallcraft
          </h1>
          <div className="h-[1px] w-16 bg-[#c6a87c] mx-auto mt-4 mb-4 opacity-60"></div>
          <p className="text-zinc-400 text-xs sm:text-sm max-w-lg mx-auto leading-relaxed">
            สอบถามข้อมูลสินค้าผนังตกแต่ง หินวีเนียร์ ระแนงไม้พรีเมียม หรือขอใบเสนอราคาโครงการ
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 items-start">
          {/* Left: Contact Info */}
          <div className="md:col-span-5 space-y-6 text-sm text-zinc-300">
            <div className="border border-white/10 p-6 rounded-2xl bg-white/[0.02]">
              <h3 className="text-white font-medium text-base mb-2 font-['Playfair_Display']">
                โชว์รูมและสำนักงานใหญ่
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed mb-4">
                332 ถนนประดิษฐ์มนูธรรม แขวงวังทองหลาง เขตวังทองหลาง กรุงเทพฯ 10310
              </p>
              <div className="space-y-2 text-xs border-t border-white/10 pt-4">
                <p>
                  <span className="text-zinc-500">โทร:</span>{' '}
                  <a href="tel:021234567" className="text-[#c6a87c] hover:underline">
                    02-XXX-XXXX
                  </a>
                </p>
                <p>
                  <span className="text-zinc-500">LINE:</span>{' '}
                  <span className="text-white">@wallcraft</span>
                </p>
                <p>
                  <span className="text-zinc-500">เปิดทำการ:</span>{' '}
                  <span className="text-zinc-400">จันทร์ - เสาร์ (09:00 - 18:00 น.)</span>
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <Link
                href="/contact/showrooms"
                className="flex-1 text-center py-2.5 px-4 rounded-xl border border-white/10 text-xs text-zinc-300 hover:border-[#c6a87c] hover:text-[#c6a87c] transition-colors"
              >
                ดูสาขาโชว์รูม
              </Link>
              <Link
                href="/contact/location"
                className="flex-1 text-center py-2.5 px-4 rounded-xl border border-white/10 text-xs text-zinc-300 hover:border-[#c6a87c] hover:text-[#c6a87c] transition-colors"
              >
                แผนที่เดินทาง
              </Link>
            </div>
          </div>

          {/* Right: Contact Form */}
          <div className="md:col-span-7 bg-white/[0.03] border border-white/10 p-6 sm:p-8 rounded-2xl">
            {submitted ? (
              <div className="py-12 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-950/60 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto text-xl">
                  ✓
                </div>
                <h3 className="text-xl font-medium text-white">ส่งข้อความเรียบร้อยแล้ว</h3>
                <p className="text-xs text-zinc-400 max-w-sm mx-auto leading-relaxed">
                  ทีมงาน Wallcraft ได้รับข้อมูลของท่านแล้ว และจะติดต่อกลับเพื่อให้ข้อมูลโดยเร็วที่สุดครับ
                </p>
                <button
                  type="button"
                  onClick={() => setSubmitted(false)}
                  className="mt-4 text-xs text-[#c6a87c] uppercase tracking-wider border-b border-[#c6a87c] pb-1 cursor-pointer"
                >
                  ส่งข้อความอื่นเพิ่มเติม
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {errorMsg && (
                  <div className="p-3 text-xs text-rose-300 bg-rose-950/40 border border-rose-800 rounded-lg">
                    {errorMsg}
                  </div>
                )}

                <div>
                  <label className="block text-xs uppercase tracking-wider text-zinc-400 mb-1.5">
                    ชื่อ-นามสกุล / ชื่อผู้ติดต่อ *
                  </label>
                  <input
                    required
                    type="text"
                    placeholder="เช่น คุณสมชาย สดชื่น"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-white/15 bg-black/40 text-white placeholder-zinc-600 text-sm focus:outline-none focus:border-[#c6a87c] transition-colors"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs uppercase tracking-wider text-zinc-400 mb-1.5">
                      เบอร์โทรศัพท์ *
                    </label>
                    <input
                      required
                      type="tel"
                      placeholder="08X-XXX-XXXX"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-white/15 bg-black/40 text-white placeholder-zinc-600 text-sm focus:outline-none focus:border-[#c6a87c] transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-wider text-zinc-400 mb-1.5">
                      อีเมล
                    </label>
                    <input
                      type="email"
                      placeholder="name@email.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-white/15 bg-black/40 text-white placeholder-zinc-600 text-sm focus:outline-none focus:border-[#c6a87c] transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-wider text-zinc-400 mb-1.5">
                    ข้อความ / สินค้าที่สนใจ *
                  </label>
                  <textarea
                    required
                    rows={4}
                    placeholder="ระบุสินค้าที่ต้องการ เช่น หินวีเนียร์ลายโปร่งแสง, ขนาดพื้นที่ หรือขอใบเสนอราคา..."
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-white/15 bg-black/40 text-white placeholder-zinc-600 text-sm focus:outline-none focus:border-[#c6a87c] transition-colors resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 rounded-xl bg-[#c6a87c] hover:bg-[#b09367] text-black font-semibold text-xs uppercase tracking-widest transition-colors cursor-pointer disabled:opacity-50 mt-2"
                >
                  {submitting ? 'กำลังส่งข้อมูล...' : 'ส่งข้อความติดต่อ'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
