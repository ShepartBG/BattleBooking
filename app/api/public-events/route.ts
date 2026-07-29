import { NextResponse } from "next/server"; import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
export const dynamic="force-dynamic";
export async function GET(){try{const db=getSupabaseAdmin();const {data,error}=await db.from("special_events").select("*").eq("status","active").order("featured",{ascending:false}).order("start_date",{ascending:true});if(error)throw error;return NextResponse.json({ok:true,events:data||[]});}catch(e){return NextResponse.json({ok:false,message:e instanceof Error?e.message:"Грешка"},{status:500});}}
