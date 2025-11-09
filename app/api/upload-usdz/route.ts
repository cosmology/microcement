import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const userId = formData.get('userId') as string
    const type = formData.get('type') as string
    const source = formData.get('source') as string

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (!userId) {
      return NextResponse.json({ error: 'No user ID provided' }, { status: 400 })
    }

    // Validate file type
    if (!file.name.endsWith('.usdz') && file.type !== 'model/vnd.usdz+zip') {
      return NextResponse.json({ error: 'Invalid file type. Only USDZ files are allowed.' }, { status: 400 })
    }

    // Create directory structure for scanned rooms
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const fileName = `${source}-${timestamp}-${file.name}`
    const uploadDir = join(process.cwd(), 'public', 'models', 'scanned-rooms', userId)
    
    // Ensure directory exists
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true })
    }

    const filePath = join(uploadDir, fileName)

    // Convert file to buffer and save
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filePath, buffer)

    // Return success response with file info
    return NextResponse.json({
      success: true,
      message: 'USDZ file uploaded successfully',
      file: {
        name: fileName,
        path: `/models/scanned-rooms/${userId}/${fileName}`,
        size: file.size,
        type: file.type,
        uploadedAt: new Date().toISOString(),
        source: source,
        userId: userId
      }
    })

  } catch (error) {
    console.error('Error uploading USDZ file:', error)
    return NextResponse.json(
      { error: 'Failed to upload USDZ file' },
      { status: 500 }
    )
  }
}
