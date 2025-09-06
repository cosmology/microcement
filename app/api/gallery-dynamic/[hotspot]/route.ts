export async function GET(request: Request, { params }: { params: { hotspot: string } }) {
  return Response.json({ 
    message: 'Dynamic Gallery API working!', 
    hotspot: params.hotspot,
    timestamp: new Date().toISOString() 
  });
}
