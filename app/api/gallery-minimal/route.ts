export async function GET() {
  return Response.json({ message: 'Gallery API working!', timestamp: new Date().toISOString() });
}
