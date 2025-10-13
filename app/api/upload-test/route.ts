import { NextResponse } from 'next/server'

export async function POST() {
  console.log('📤 [Upload Test API] POST request received')
  return NextResponse.json({ message: 'Upload test route working' }, { status: 200 })
}