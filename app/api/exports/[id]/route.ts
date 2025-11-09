import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: exportId } = await params;

    if (!exportId) {
      return NextResponse.json({ error: 'Export ID is required' }, { status: 400 });
    }

    // Fetch export data from database
    const { data: exportData, error } = await supabaseAdmin
      .from('exports')
      .select('*')
      .eq('id', exportId)
      .single();

    if (error) {
      console.error('Error fetching export data:', error);
      return NextResponse.json({ error: 'Export not found' }, { status: 404 });
    }

    return NextResponse.json(exportData);
  } catch (error) {
    console.error('Error in exports API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
