export type VINDecodeResult = {
  Make: string
  Model: string
  ModelYear: string
  EngineCylinders: string
  DisplacementL: string
  FuelTypePrimary: string
  Trim: string
  VehicleType: string
  BodyClass: string
  DriveType: string
  TransmissionStyle: string
  PlantCountry: string
  ErrorCode: string
  ErrorText: string
}

export type VINData = {
  make: string
  model: string
  year: number
  engine: string
  trim: string
  valid: boolean
  error?: string
}

export async function decodeVIN(vin: string): Promise<VINData> {
  const url = `https://vpic.nhtsa.dot.gov/api/vehicles/decodevin/${vin}?format=json`

  const response = await fetch(url)
  if (!response.ok) {
    throw new Error('Failed to contact NHTSA API')
  }

  const data = await response.json()
  const results: VINDecodeResult[] = data.Results

  const getValue = (variable: string) =>
    (results.find((r: any) => r.Variable === variable) as any)?.Value ?? ''

  const make = getValue('Make')
  const model = getValue('Model')
  const year = parseInt(getValue('Model Year')) || 0
  const cylinders = getValue('Engine Number of Cylinders')
  const displacement = getValue('Displacement (L)')
  const fuelType = getValue('Fuel Type - Primary')
  const trim = getValue('Trim')

  const engineParts = []
  if (displacement) engineParts.push(`${displacement}L`)
  if (cylinders) engineParts.push(`V${cylinders}`)
  if (fuelType && fuelType !== 'Gasoline') engineParts.push(fuelType)
  const engine = engineParts.join(' ')

  // Error codes: 0 = no error, 6 = partial match (still usable)
  const valid = make !== '' && model !== '' && year > 0

  return { make, model, year, engine, trim, valid }
}

export async function getRecalls(make: string, model: string, year: number) {
  const url = `https://api.nhtsa.gov/recalls/recallsByVehicle?make=${encodeURIComponent(make)}&model=${encodeURIComponent(model)}&modelYear=${year}`

  try {
    const response = await fetch(url)
    if (!response.ok) return []
    const data = await response.json()
    return data.results ?? []
  } catch {
    return []
  }
}
