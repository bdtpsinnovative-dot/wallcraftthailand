import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const updateData = {
      latest_version: "1.0.6",
      // แยก Link ของ Android (APK) และ iOS (TestFlight)
      download_url_android: "https://app.wallcraftthailand.com/base%20(3).apk", 
      download_url_ios: "https://testflight.apple.com/join/YOUR_TESTFLIGHT_ID", 
      release_date: "2026-05-12",
      change_log: "เพิ่มระบบตรวจสอบการอัปเดตอัตโนมัติ และปรับปรุงประสิทธิภาพแอป เพิ่มระบบสอตกสินค้าและติดตามสินค้า"
      
    };

    return NextResponse.json(updateData);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch update data" }, 
      { status: 500 }
    );
  }
}