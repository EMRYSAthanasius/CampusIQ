import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/storage-debug
 * Diagnostic: lists the actual structure of the materials bucket and course_materials DB rows.
 * Remove this route after debugging.
 */
export async function GET(req: NextRequest) {
  const adminSupabase = createSupabaseAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    // 1. List root of materials bucket
    const { data: rootItems, error: rootErr } = await adminSupabase.storage
      .from('materials')
      .list('', { limit: 100 });

    const bucketTree: Record<string, any[]> = {};

    for (const item of rootItems || []) {
      if (!item.id) {
        // It's a folder — list its contents
        const { data: subItems } = await adminSupabase.storage
          .from('materials')
          .list(item.name, { limit: 100 });

        bucketTree[item.name] = [];

        for (const sub of subItems || []) {
          if (!sub.id) {
            // sub-subfolder
            const { data: deepItems } = await adminSupabase.storage
              .from('materials')
              .list(`${item.name}/${sub.name}`, { limit: 100 });
            bucketTree[item.name].push({
              folder: sub.name,
              files: (deepItems || []).map(f => ({ name: f.name, size: f.metadata?.size }))
            });
          } else {
            bucketTree[item.name].push({ file: sub.name, size: sub.metadata?.size });
          }
        }
      }
    }

    // 2. List course_materials DB rows
    const { data: dbMaterials, error: dbErr } = await adminSupabase
      .from('course_materials')
      .select('id, course_id, title, file_url, is_active')
      .order('created_at', { ascending: false })
      .limit(20);

    // 3. List courses
    const { data: courses } = await adminSupabase
      .from('courses')
      .select('id, code, title')
      .order('code');

    return NextResponse.json({
      bucket_structure: bucketTree,
      root_items: (rootItems || []).map(i => ({ name: i.name, isFolder: !i.id })),
      root_error: rootErr?.message,
      db_materials: dbMaterials,
      db_error: dbErr?.message,
      courses: courses,
    });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
