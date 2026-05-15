import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Polyfill missing browser globals required by pdfjs-dist in Node.js
if (typeof global !== 'undefined') {
  if (typeof (global as any).DOMMatrix === 'undefined') {
    (global as any).DOMMatrix = class DOMMatrix {};
  }
  if (typeof (global as any).Path2D === 'undefined') {
    (global as any).Path2D = class Path2D {};
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

    if (!storagePath) {
      return NextResponse.json({ error: 'Missing storagePath' }, { status: 400 });
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

    // Convert response to ArrayBuffer
    const arrayBuffer = await fetchRes.arrayBuffer();
    
    // Validate the Buffer
    if (!arrayBuffer || arrayBuffer.byteLength === 0) {
      console.error('Downloaded file is empty or invalid ArrayBuffer');
      return NextResponse.json({ error: 'Downloaded file is empty' }, { status: 400 });
    }

    const buffer = Buffer.from(arrayBuffer);

    // Parse the PDF using pdf-parse v2 API
    const { PDFParse } = require('pdf-parse');
    
    if (!PDFParse) {
      throw new Error('PDFParse class not found. Ensure pdf-parse v2 is correctly exported.');
    }

    const parser = new PDFParse({ data: buffer });
    let text = '';
    
    try {
      const result = await parser.getText();
      text = result.text;
    } finally {
      // Must free memory in v2
      await parser.destroy();
    }
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
        numpages: parsedData.numpages,
        info: parsedData.info,
      },
      blocks,
      rawText: text
    });

  } catch (error: any) {
    console.error('PDF Parse Route Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error.message },
      { status: 500 }
    );
  }
}
