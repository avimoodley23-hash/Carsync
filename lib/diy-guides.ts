export type DIYGuide = {
  serviceId: string
  title: string
  difficulty: 'Easy' | 'Medium' | 'Hard'
  time: string
  canDIY: boolean
  steps: string[]
  tips: string[]
  tools?: string[]
}

export const DIY_GUIDES: Record<string, DIYGuide> = {
  'Oil Change': {
    serviceId: 'Oil Change',
    title: 'How to Check & Top Up Engine Oil',
    difficulty: 'Easy',
    time: '5 minutes',
    canDIY: true,
    steps: [
      'Park on level ground and turn engine off. Wait 5 minutes.',
      'Open the bonnet and find the dipstick (usually yellow or orange handle).',
      'Pull it out, wipe clean with a rag, push it back in fully.',
      'Pull it out again and check the oil level between the MIN and MAX marks.',
      'If low, unscrew the oil cap (top of engine) and add the correct oil slowly.',
      'Check again with dipstick. Do not overfill.',
    ],
    tips: [
      'Check your manual for the correct oil grade (e.g. 5W-30)',
      'Oil should be amber/light brown — black oil means it needs changing',
      'Never run engine with low oil — it causes serious damage',
    ],
    tools: ['Dipstick (built-in)', 'Rag', 'Correct engine oil'],
  },
  'Tyre Rotation': {
    serviceId: 'Tyre Rotation',
    title: 'Tyre Pressure Check',
    difficulty: 'Easy',
    time: '10 minutes',
    canDIY: true,
    steps: [
      'Find the recommended tyre pressure — sticker inside driver door or manual.',
      'Remove the valve cap from each tyre.',
      'Press tyre gauge firmly onto the valve stem.',
      'Read the pressure and compare to recommended.',
      'Add air at a petrol station if needed (usually free).',
      'Replace valve caps tightly.',
    ],
    tips: [
      'Check when tyres are cold (not after driving)',
      'Under-inflated tyres increase fuel consumption by up to 3%',
      "Don't forget to check the spare tyre",
    ],
  },
  'Coolant Flush': {
    serviceId: 'Coolant Flush',
    title: 'How to Check Coolant Level',
    difficulty: 'Easy',
    time: '2 minutes',
    canDIY: true,
    steps: [
      'NEVER open the radiator cap when the engine is hot — risk of serious burns.',
      'Wait until engine is completely cool.',
      'Find the translucent plastic reservoir (usually has a coloured cap).',
      'Check fluid level against MIN and MAX marks on the side.',
      'If low, top up with the correct coolant mixed 50/50 with distilled water.',
    ],
    tips: [
      'Use the coolant colour specified in your manual',
      'Milky or oily coolant = serious engine problem, see mechanic immediately',
      'Low coolant can cause overheating and engine damage',
    ],
  },
  'Brake Inspection': {
    serviceId: 'Brake Inspection',
    title: 'Brake Warning Signs',
    difficulty: 'Easy',
    time: '5 minutes',
    canDIY: false,
    steps: [
      'Listen for squealing or grinding when braking — brake pads may be worn.',
      'Notice if car pulls left or right when braking — may need adjustment.',
      'Check if brake pedal feels soft or goes to the floor — brake fluid issue.',
      'Look through wheel spokes at the rotor — deep grooves or scoring = worn.',
      'If any of the above — book a mechanic, do not delay.',
    ],
    tips: [
      'Brakes are safety-critical — never ignore warning signs',
      'Brake pad replacement costs R600-1500 at most workshops',
      'Doing brakes early is much cheaper than replacing rotors too',
    ],
  },
  'Wiper Blades': {
    serviceId: 'Wiper Blades',
    title: 'How to Replace Wiper Blades',
    difficulty: 'Easy',
    time: '10 minutes',
    canDIY: true,
    steps: [
      'Lift the wiper arm away from the windscreen.',
      'Find the release tab where the blade connects to the arm.',
      'Press the tab and slide the blade off.',
      'Match the new blade size (check packaging or old blade).',
      'Slide new blade onto arm until it clicks.',
      'Gently lower arm back onto windscreen.',
    ],
    tips: [
      'Buy blades at Midas, Supaquick, or any parts store (R80-200)',
      'Replace both blades at the same time',
      'Rear wiper is usually a different size — check separately',
    ],
  },
  'Battery Check': {
    serviceId: 'Battery Check',
    title: 'Battery Health Check',
    difficulty: 'Easy',
    time: '5 minutes',
    canDIY: true,
    steps: [
      'Look at the battery terminals for white or blue powder (corrosion).',
      'If corroded: disconnect negative (black) terminal first, then positive (red).',
      'Mix baking soda with water and scrub terminals with old toothbrush.',
      'Rinse with water, dry, reconnect positive then negative.',
      'Check that battery is secured firmly — vibration kills batteries.',
    ],
    tips: [
      'Most batteries last 3-5 years in SA heat',
      'Slow starting, dim lights = battery getting weak',
      'Most tyre fitment centres test batteries for free',
    ],
  },
}
