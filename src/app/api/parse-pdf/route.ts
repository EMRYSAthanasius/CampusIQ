import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { PDFParse } from 'pdf-parse';

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

    // Download the file from Supabase Storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from(bucket)
      .download(storagePath);

    if (downloadError || !fileData) {
      console.error('Error downloading PDF:', downloadError);
      return NextResponse.json({ error: 'Failed to download PDF' }, { status: 404 });
    }

    // Convert Blob to Buffer for pdf-parse
    const arrayBuffer = await fileData.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Parse the PDF
    const parser = new PDFParse({ data: buffer });
    const parsedData = await parser.getText();
    const infoData = await parser.getInfo();
    
    // Structure the raw text into paragraphs
    const text = parsedData.text;
    
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
      const { error: updateError } = await supabase
        .from('course_materials')
        .update({ parsed_content: JSON.stringify(blocks) })
        .eq('id', materialId);
        
      if (updateError) {
        console.error('Failed to save parsed content:', updateError);
      }
    }

    return NextResponse.json({
      success: true,
      metadata: {
        numpages: parsedData.total,
        info: infoData.info,
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
