import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import pdf from 'pdf-parse-fork';

interface GlobalPdfPolyfills {
  DOMMatrix?: unknown;
  Path2D?: unknown;
}

// Polyfill missing browser globals required by pdfjs-dist in Node.js
if (typeof global !== 'undefined') {
  const g = global as unknown as GlobalPdfPolyfills;
  if (typeof g.DOMMatrix === 'undefined') {
    g.DOMMatrix = class DOMMatrix {};
  }
  if (typeof g.Path2D === 'undefined') {
    g.Path2D = class Path2D {};
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { storagePath, bucket = 'materials', materialId } = body;

    if (!storagePath || typeof storagePath !== 'string') {
      return NextResponse.json({ error: 'Missing or invalid storagePath' }, { status: 400 });
    }

    // SSRF Prevention: Validate that storagePath is a local path or belongs to the allowed Supabase URL domain
    if (storagePath.startsWith('http')) {
      const allowedDomain = process.env.NEXT_PUBLIC_SUPABASE_URL;
      if (!allowedDomain || !storagePath.startsWith(allowedDomain)) {
        console.error('SSRF prevention: Blocked fetch request to unauthorized URL:', storagePath);
        return NextResponse.json({ error: 'Access denied: Unauthorized URL destination.' }, { status: 403 });
      }
    }

    // Download the file from Supabase Storage using the public URL
    console.log('Fetching from Supabase Storage:', { bucket, storagePath, materialId });

    let publicUrl = storagePath;
    if (!storagePath.startsWith('http')) {
      const { data } = supabase.storage.from(bucket).getPublicUrl(storagePath);
      publicUrl = data.publicUrl;
    }

    console.log('Resolved public URL:', publicUrl);

    const fetchRes = await fetch(publicUrl);
    if (!fetchRes.ok) {
      console.error('Error fetching PDF from URL:', fetchRes.status, fetchRes.statusText);
      return NextResponse.json({ error: `Failed to download PDF (HTTP ${fetchRes.status})` }, { status: 404 });
    }

    // Enforce file size limit via content-length header if present
    const contentLength = fetchRes.headers.get('content-length');
    const maxSizeBytes = 50 * 1024 * 1024; // 50MB
    if (contentLength) {
      const sizeBytes = parseInt(contentLength, 10);
      if (sizeBytes > maxSizeBytes) {
        console.error('SSRF/Security: File size limit exceeded:', sizeBytes);
        return NextResponse.json({ error: 'File size too large (maximum 50MB).' }, { status: 413 });
      }
    }

    // Convert response to ArrayBuffer
    const contentType = fetchRes.headers.get('content-type');
    console.log('Fetched content type:', contentType);
    
    const arrayBuffer = await fetchRes.arrayBuffer();
    
    // Double check file size limit on actual arrayBuffer
    if (arrayBuffer.byteLength > maxSizeBytes) {
      console.error('SSRF/Security: Actual file size limit exceeded:', arrayBuffer.byteLength);
      return NextResponse.json({ error: 'File size too large (maximum 50MB).' }, { status: 413 });
    }

    // Validate the Buffer
    if (!arrayBuffer || arrayBuffer.byteLength === 0) {
      console.error('Downloaded file is empty or invalid ArrayBuffer');
      return NextResponse.json({ error: 'Downloaded file is empty' }, { status: 400 });
    }

    const buffer = Buffer.from(arrayBuffer);
    
    // Check for PDF magic bytes
    const magicBytes = buffer.toString('utf8', 0, 5);
    console.log('PDF Magic Bytes:', magicBytes);
    
    if (magicBytes !== '%PDF-') {
      console.error('Invalid PDF header. First 5 bytes:', magicBytes);
      // If it looks like HTML, it's likely a Supabase error page or auth redirect
      if (magicBytes.toLowerCase().includes('<!doc') || magicBytes.toLowerCase().includes('<html')) {
        return NextResponse.json({ error: 'Received HTML instead of PDF. Check Supabase access policies.' }, { status: 403 });
      }
      return NextResponse.json({ error: `Invalid PDF structure (Header: ${magicBytes})` }, { status: 422 });
    }

    // Parse the PDF using pdf-parse-fork (functional API)
    const data = await pdf(buffer);
    const text = data.text;
    const numpages = data.numpages;
    const info = data.info;
    if (!text || text.trim().length === 0) {
      console.warn('PDF parsing resulted in empty text. May be an image-based PDF.');
      return NextResponse.json({ error: 'Parsed text is empty. The document may be image-based or scanned.' }, { status: 422 });
    }
    
    // Structure the raw text into paragraphs
    // Split by double newlines or single newlines that seem to separate paragraphs
    const rawParagraphs = text.split(/\n\s*\n/);
    const paragraphs = rawParagraphs
      .map((p: string) => p.trim())
      .filter((p: string) => p.length > 0)
      .map((p: string) => p.replace(/\n/g, ' ')); // Remove arbitrary line breaks within paragraphs

    // Optionally format as markdown-ish JSON
    const blocks = paragraphs.map((text: string, i: number) => ({
      id: `p-${i}`,
      type: 'paragraph',
      content: text,
    }));

    if (materialId) {
      console.log(`Attempting to update course_materials table for id: ${materialId}`);
      const { error: updateError } = await supabase
        .from('course_materials')
        .update({ parsed_content: JSON.stringify(blocks) })
        .eq('id', materialId);
        
      if (updateError) {
        console.error('Failed to save parsed content:', updateError);
      } else {
        console.log(`Successfully updated course_materials for id: ${materialId}`);
      }
    }

    return NextResponse.json({
      success: true,
      metadata: {
        numpages: numpages,
        info: info,
      },
      blocks,
      rawText: text
    });

  } catch (error: unknown) {
    console.error('PDF Parse Route Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
