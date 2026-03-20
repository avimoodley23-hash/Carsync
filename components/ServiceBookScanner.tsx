'use client'
import { useState, useRef } from 'react'
import { Camera, Upload, X, CheckCircle, Loader } from 'lucide-react'
import { toast } from 'sonner'

interface Extracted {
  date: string | null
  odometer: number | null
  serviceType: string | null
  cost: number | null
  notes: string | null
  workshop: string | null
}

interface Props {
  onExtracted: (data: Extracted) => void
  onClose: () => void
}

export default function ServiceBookScanner({ onExtracted, onClose }: Props) {
  const [scanning, setScanning] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const [result, setResult] = useState<Extracted | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)

  const handleFile = async (file: File) => {
    const url = URL.createObjectURL(file)
    setPreview(url)
    setScanning(true)
    setResult(null)

    try {
      const form = new FormData()
      form.append('image', file)

      const res = await fetch('/api/scan-service-book', { method: 'POST', body: form })
      const data = await res.json()

      if (data.success && data.data) {
        setResult(data.data)
        toast.success('Scanned! Review and confirm below.')
      } else {
        toast.error('Could not read the image clearly. Try better lighting.')
      }
    } catch {
      toast.error('Scan failed. Check your connection.')
    }
    setScanning(false)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 300, display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '52px 20px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#f5f5f5' }}>Scan Service Book</h2>
          <p style={{ fontSize: 13, color: '#888', marginTop: 2 }}>Take a photo or upload an image</p>
        </div>
        <button onClick={onClose} style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 10, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <X size={18} color="#888" />
        </button>
      </div>

      <div style={{ flex: 1, padding: '0 20px', overflowY: 'auto' }}>
        {/* Image preview */}
        {preview && (
          <div style={{ marginBottom: 16, borderRadius: 16, overflow: 'hidden', border: '1px solid #2a2a2a' }}>
            <img src={preview} alt="Service book" style={{ width: '100%', maxHeight: 300, objectFit: 'contain', background: '#111' }} />
          </div>
        )}

        {/* Scanning state */}
        {scanning && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px 0', gap: 12 }}>
            <Loader size={32} color="#ff6b2b" style={{ animation: 'spin 1s linear infinite' }} />
            <p style={{ color: '#888', fontSize: 14 }}>Reading your service book...</p>
          </div>
        )}

        {/* Result */}
        {result && !scanning && (
          <div style={{ background: '#1a1a1a', border: '1px solid #22c55e44', borderRadius: 16, padding: 20, marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <CheckCircle size={18} color="#22c55e" />
              <p style={{ fontSize: 15, fontWeight: 600, color: '#f5f5f5' }}>Extracted info</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { label: 'Date', value: result.date },
                { label: 'Odometer', value: result.odometer ? `${result.odometer.toLocaleString()} km` : null },
                { label: 'Service', value: result.serviceType },
                { label: 'Cost', value: result.cost ? `R${result.cost}` : null },
                { label: 'Workshop', value: result.workshop },
                { label: 'Notes', value: result.notes },
              ].map(({ label, value }) => value && (
                <div key={label} style={{ display: 'flex', gap: 12 }}>
                  <span style={{ fontSize: 13, color: '#888', width: 80, flexShrink: 0 }}>{label}</span>
                  <span style={{ fontSize: 13, color: '#f5f5f5', flex: 1 }}>{value}</span>
                </div>
              ))}
            </div>
            <button
              onClick={() => { onExtracted(result); onClose() }}
              style={{ marginTop: 16, width: '100%', padding: '14px', background: '#ff6b2b', border: 'none', borderRadius: 12, color: 'white', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}
            >
              Use This Info
            </button>
            <button
              onClick={() => { setResult(null); setPreview(null) }}
              style={{ marginTop: 8, width: '100%', padding: '12px', background: 'transparent', border: '1px solid #2a2a2a', borderRadius: 12, color: '#888', fontSize: 14, cursor: 'pointer' }}
            >
              Try Again
            </button>
          </div>
        )}

        {/* Upload buttons */}
        {!scanning && !result && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button
              onClick={() => cameraRef.current?.click()}
              style={{ padding: '20px', background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}
            >
              <Camera size={24} color="#ff6b2b" />
              <div style={{ textAlign: 'left' }}>
                <p style={{ fontSize: 15, fontWeight: 600, color: '#f5f5f5' }}>Take Photo</p>
                <p style={{ fontSize: 12, color: '#888', marginTop: 2 }}>Use your camera</p>
              </div>
            </button>
            <button
              onClick={() => fileRef.current?.click()}
              style={{ padding: '20px', background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}
            >
              <Upload size={24} color="#3b82f6" />
              <div style={{ textAlign: 'left' }}>
                <p style={{ fontSize: 15, fontWeight: 600, color: '#f5f5f5' }}>Upload Image</p>
                <p style={{ fontSize: 12, color: '#888', marginTop: 2 }}>From your gallery</p>
              </div>
            </button>
            <p style={{ fontSize: 12, color: '#555', textAlign: 'center', marginTop: 8 }}>
              For best results: good lighting, flat surface, all text visible
            </p>
          </div>
        )}
      </div>

      <input ref={cameraRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
      <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />

      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
