import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const updateData = {
      // เอาไว้สำหรับแอปเวอร์ชันเก่าที่ยังไม่ได้อัปเดตโค้ดใหม่ จะได้ไม่พัง
      latest_version: "2.0.0",
      // แยก Version ของ Android และ iOS (สำหรับแอปเวอร์ชันใหม่)
      latest_version_android: "2.0.7",
      latest_version_ios: "2.0.7",
      // แยก Link ของ Android (APK) และ iOS (TestFlight)
      download_url_android: "https://app.wallcraftthailand.com/app-release.apk",
      download_url_ios: "https://testflight.apple.com/join/BXMvdwVM",
      release_date: "2026-09-24",
      change_log: "แก้ไขการบันทึกบริษัทและโครงการในหน้า New Record และปรับปรุงการแสดงผลในหน้า Pool Orders"
    };

    return NextResponse.json(updateData);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch update data" },
      { status: 500 }
    );
  }
}