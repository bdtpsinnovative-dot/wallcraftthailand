import { NextRequest, NextResponse } from 'next/server';
import { pipeline, env, RawImage } from '@xenova/transformers';
import { createClient } from '@supabase/supabase-js';
import { Jimp } from 'jimp'; // 🌟 1. เปลี่ยนมาใช้ Jimp แทน Sharp เพื่อแก้ปัญหา Crash บน Windows

// 🌟 2. ตั้งค่า Environment สำหรับ Vercel
env.allowLocalModels = false; 
env.useBrowserCache = false;  

// 🚀 3. บังคับใช้ WASM 
if (env.backends?.onnx?.wasm) {
    env.backends.onnx.wasm.proxy = false;
    env.backends.onnx.wasm.numThreads = 1; 
}

let extractor: any = null;

function normalize(vector: number[]) {
    const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    return vector.map(val => val / magnitude);
}

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const imageFile = formData.get('image') as File;
        if (!imageFile) return NextResponse.json({ error: "กรุณาอัปโหลดรูปภาพ" }, { status: 400 });

        if (!extractor) {
            extractor = await pipeline('image-feature-extraction', 'Xenova/clip-vit-base-patch32');
        }
        
        const arrayBuffer = await imageFile.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        
        // เก็บ Base64 ไว้ให้ลูกพี่ Gemini
        const base64Image = buffer.toString("base64");
        let mimeType = imageFile.type;
        if (!mimeType || mimeType === 'application/octet-stream') {
            mimeType = 'image/jpeg'; 
        }

        // 🚀 4. ใช้ Jimp ถอดข้อมูลภาพเป็น Pixel ดิบแทน Sharp (เพื่อป้องกัน Windows Server Crash)
        const jimpImage = await Jimp.read(buffer);
        const { width, height, data } = jimpImage.bitmap; // data จะเป็น RGBA 4 channels
        
        // แปลง RGBA เป็น RGB (3 channels) ให้ตรงกับสเปคของ AI Model
        const rgbData = new Uint8Array(width * height * 3);
        for (let i = 0; i < width * height; i++) {
            rgbData[i * 3] = data[i * 4];         // R
            rgbData[i * 3 + 1] = data[i * 4 + 1]; // G
            rgbData[i * 3 + 2] = data[i * 4 + 2]; // B
        }

        // สร้างภาพจำลองขึ้นมาใหม่จากข้อมูลพิกเซลดิบ
        const image = new RawImage(rgbData, width, height, 3);
        
        // ยัดให้ AI แปลงเวกเตอร์ได้เลย!
        const output = await extractor(image);
        
        const normalizedEmbedding = normalize(Array.from(output.data) as number[]);

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY! 
        );

        const { data: products, error: dbError } = await supabase.rpc('match_product_variants', {
            query_embedding: normalizedEmbedding, 
            match_threshold: 0.75, 
            match_count: 6 
        });

        if (dbError) throw dbError;

        if (!products || products.length === 0) {
            const apiKey = process.env.GEMINI_API_KEY;
            
            try {
                const response = await fetch(
                    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
                    {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            contents: [{
                                parts: [
                                    { text: "รูปนี้คือรูปอะไร? ตอบสั้นๆ และบอกว่าสินค้านี้ไม่มีในระบบของ TPS Garden (เพราะเราขายแผ่นลายไม้) ตอบแบบสุภาพ 2 ประโยค" },
                                    {
                                        inline_data: {
                                            mime_type: mimeType,
                                            data: base64Image
                                        }
                                    }
                                ]
                            }]
                        })
                    }
                );

                const data = await response.json();
                if (data.error) throw new Error(data.error.message);
                const aiMessage = data.candidates[0].content.parts[0].text;

                return NextResponse.json({ 
                    message: "ไม่พบสินค้าในระบบ",
                    ai_analysis: aiMessage,
                    products: [] 
                });

            } catch (aiErr: any) {
                return NextResponse.json({ 
                    message: "ไม่พบสินค้า",
                    ai_analysis: "จากที่ระบบ AI ตรวจสอบ สิ่งนี้ไม่ใช่สินค้าในคลังของเราครับ (TPS Garden ของเราจำหน่ายเฉพาะวัสดุตกแต่งบ้านและลายไม้ครับ)", 
                    products: [] 
                });
            }
        }

        return NextResponse.json({ message: "ค้นหาสำเร็จ!", products: products });

    } catch (error: any) {
        console.error("API Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}