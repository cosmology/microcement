export async function GET(request: Request, { params }: { params: Promise<{ hotspot: string }> }) {
  const resolvedParams = await params;
  return Response.json({ 
    message: 'Dynamic Gallery API working!', 
    hotspot: resolvedParams.hotspot,
    timestamp: new Date().toISOString() 
  });
}
