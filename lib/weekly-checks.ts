export type WeeklyCheck = {
  id: string
  label: string
  description: string
  howTo: string
  icon: string
  critical: boolean
}

export const WEEKLY_CHECKS: WeeklyCheck[] = [
  {
    id: 'oil',
    label: 'Oil Level',
    description: 'Check engine oil is between MIN and MAX',
    howTo: 'Park on flat ground. Wait 5 min after engine off. Pull dipstick, wipe clean, reinsert fully, pull again. Oil should be between the two marks.',
    icon: 'Droplets',
    critical: true,
  },
  {
    id: 'coolant',
    label: 'Coolant / Water',
    description: 'Check coolant reservoir is between MIN and MAX',
    howTo: 'NEVER open radiator cap when engine is hot. Check the plastic reservoir on the side — fluid should be between MIN and MAX lines.',
    icon: 'Thermometer',
    critical: true,
  },
  {
    id: 'tyres',
    label: 'Tyre Pressure',
    description: 'Check all 4 tyres look properly inflated',
    howTo: 'Use a tyre gauge or petrol station pump. Recommended pressure is on a sticker inside your driver door jamb. Check spare too.',
    icon: 'Circle',
    critical: true,
  },
  {
    id: 'washer',
    label: 'Washer Fluid',
    description: 'Check windscreen washer reservoir has fluid',
    howTo: 'Find the blue-capped reservoir under the bonnet. Top up with washer fluid or water + a drop of dish soap.',
    icon: 'Waves',
    critical: false,
  },
  {
    id: 'lights',
    label: 'Lights',
    description: 'Quick check all lights are working',
    howTo: 'Walk around the car with hazards on. Ask someone to check brake lights while you press the pedal. Replace blown bulbs immediately.',
    icon: 'Lightbulb',
    critical: false,
  },
]

export const MONTHLY_CHECKS: WeeklyCheck[] = [
  {
    id: 'brakes',
    label: 'Brake Feel',
    description: 'Notice if brakes feel soft, spongy or pulling to one side',
    howTo: 'In a safe area, brake firmly from 60 km/h. Should stop straight and firmly. Squealing or grinding = see a mechanic immediately.',
    icon: 'AlertTriangle',
    critical: true,
  },
  {
    id: 'battery',
    label: 'Battery Terminals',
    description: 'Check for white/blue corrosion on battery terminals',
    howTo: 'Open bonnet, look at battery. White or blue powder on the terminals = corrosion. Clean with baking soda + water, or visit a workshop.',
    icon: 'Zap',
    critical: false,
  },
  {
    id: 'wipers',
    label: 'Wiper Blades',
    description: 'Check wipers clean properly without streaking',
    howTo: 'Turn on wipers with washer fluid. If they streak, smear or skip, the rubber is worn. Wiper blades cost R80-150 and are easy to replace.',
    icon: 'Wind',
    critical: false,
  },
]
