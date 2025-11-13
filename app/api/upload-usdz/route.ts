import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import {
  storageConfig,
  sanitizeSegment,
  toSupabaseUri,
} from '@/lib/storage/utils'
import {
  uploadBufferToStorage,
  buildIosUploadPath,
  resolveStorageUrls,
} from '@/lib/storage/server'

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

    const sanitizedUserId = sanitizeSegment(userId)
    const sanitizedSceneId = sanitizeSegment(type || 'upload')
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const sanitizedSource = sanitizeSegment(source || 'web')
    const sanitizedBase = sanitizeSegment(file.name.replace(/\.[^/.]+$/, '')) || 'room'
    const fileName = `${sanitizedSource}-${timestamp}-${sanitizedBase}.usdz`

    const objectPath = buildIosUploadPath(sanitizedUserId, sanitizedSceneId, `${randomUUID()}-${fileName}`)

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    await uploadBufferToStorage(
      storageConfig.bucket,
      objectPath,
      buffer,
      file.type || 'model/vnd.usdz+zip'
    )

    const storageUri = toSupabaseUri(storageConfig.bucket, objectPath)
    const urls = await resolveStorageUrls(storageUri)

    // Return success response with file info
    return NextResponse.json({
      success: true,
      message: 'USDZ file uploaded successfully',
      file: {
        name: fileName,
        storagePath: storageUri,
        path: urls.publicUrl || urls.signedUrl || storageUri,
        publicUrl: urls.publicUrl,
        signedUrl: urls.signedUrl,
        bucket: urls.bucket ?? storageConfig.bucket,
        objectPath,
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
