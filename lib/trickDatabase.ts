// SkateQuest Trick Database
// Free, offline, no API needed
// Built by skaters, for skaters

export interface TrickData {
  name: string;
  category: 'flatground' | 'grind' | 'manual' | 'grab' | 'transition' | 'flip' | 'street';
  difficulty: 1 | 2 | 3 | 4 | 5;
  stance: 'regular' | 'goofy' | 'both';
  prerequisites: string[];
  description: string;
  footPosition: {
    front: string;
    back: string;
  };
  steps: string[];
  commonMistakes: {
    mistake: string;
    fix: string;
  }[];
  tips: string[];
  progressionTricks: string[];
  videoKeywords: string[];
}

export const TRICK_DATABASE: Record<string, TrickData> = {

  // ========== FUNDAMENTAL FLATGROUND ==========

  'ollie': {
    name: 'Ollie',
    category: 'flatground',
    difficulty: 1,
    stance: 'both',
    prerequisites: [],
    description: 'The foundation of all skateboarding. Jump with your board by popping the tail and sliding your front foot.',
    footPosition: {
      front: 'Middle of board, just behind front bolts, slightly angled toward nose',
      back: 'On the tail, toes hanging off slightly'
    },
    steps: [
      'Crouch down by bending your knees',
      'Pop the tail down sharply with your back foot',
      'As the tail hits, slide your front foot up toward the nose',
      'Level out the board at peak height with both feet over the bolts',
      'Bend your knees to absorb the landing'
    ],
    commonMistakes: [
      { mistake: 'Board only pops up on one side', fix: 'Make sure your front foot slide goes all the way to the nose edge, not just the middle' },
      { mistake: 'Not getting any height', fix: 'You need to actually jump with your back foot — snap AND jump at the same time' },
      { mistake: 'Board shooting forward', fix: 'Lean slightly forward over the board, keep your weight centered' },
      { mistake: 'Landing with just one foot', fix: 'Watch the board throughout the trick — catch it with BOTH feet over the bolts' },
      { mistake: 'Jumping before popping', fix: 'The pop comes first, then the slide and jump happen together' }
    ],
    tips: [
      'Practice the motion without moving first — stationary ollies are easier',
      'Film yourself from the side — most problems are visible immediately',
      'Your front foot does the work — the scrape up the board is everything',
      'Look at your board the whole time',
      'Commit — hesitation kills ollies more than anything else'
    ],
    progressionTricks: ['fakie ollie', 'nollie', 'switch ollie', 'ollie on a crack', 'ollie off a curb'],
    videoKeywords: ['ollie tutorial', 'how to ollie', 'ollie for beginners']
  },

  'kickflip': {
    name: 'Kickflip',
    category: 'flip',
    difficulty: 2,
    stance: 'both',
    prerequisites: ['ollie'],
    description: 'The board flips heelside with your front foot flicking out. The most iconic trick in skateboarding.',
    footPosition: {
      front: 'Just below the bolts, toes angled toward the heel edge at about 45 degrees',
      back: 'On the tail, same as ollie'
    },
    steps: [
      'Set up like an ollie but angle your front foot',
      'Pop the tail like an ollie',
      'As the board comes up, flick your front foot off the heel edge of the nose',
      'Your foot should flick out and slightly forward',
      'Let the board flip under you — dont chase it',
      'Catch the board with your back foot first when you see the grip tape',
      'Bring your front foot down to stop the flip',
      'Ride away'
    ],
    commonMistakes: [
      { mistake: 'Board flips but goes to the side', fix: 'Youre flicking too far to the side — flick forward and slightly out, not sideways' },
      { mistake: 'Board flips but rockets away from you', fix: 'You need to pop more and flick less — the ollie motion keeps it under you' },
      { mistake: 'Board only half flips', fix: 'Your flick isnt hitting the pocket — angle your foot more and flick off the very edge of the nose' },
      { mistake: 'Landing on the board but it flips over', fix: 'You caught it late — catch with your back foot when you first see the griptape' },
      { mistake: 'Cant land both feet at the same time', fix: 'Back foot catches first, then front foot. Its a two-step catch' }
    ],
    tips: [
      'The flick comes from your ankle and toes, not your whole leg',
      'Keep your shoulders parallel to the board',
      'Jump UP not forward — if you jump forward, the board goes back',
      'Watch the board flip — dont close your eyes',
      'Practice the foot position rolling slowly before going full speed'
    ],
    progressionTricks: ['heelflip', 'varial kickflip', 'hardflip', 'tre flip', 'kickflip noseslide'],
    videoKeywords: ['kickflip tutorial', 'how to kickflip', 'kickflip tips']
  },

  'heelflip': {
    name: 'Heelflip',
    category: 'flip',
    difficulty: 2,
    stance: 'both',
    prerequisites: ['ollie'],
    description: 'The board flips toeside with your heel flicking out. Opposite of kickflip.',
    footPosition: {
      front: 'Toes hanging off the toeside edge, heel toward the center',
      back: 'On the tail, same as ollie'
    },
    steps: [
      'Position front foot with toes hanging off the toe edge',
      'Pop like an ollie',
      'Kick your heel forward and out off the toe edge of the nose',
      'Your foot kicks forward, not sideways',
      'Let the board spin toeside',
      'Catch it when you see the grip tape',
      'Land clean and ride away'
    ],
    commonMistakes: [
      { mistake: 'Board flips but goes forward', fix: 'Dont kick so far forward — just a short flick off the edge' },
      { mistake: 'Double flip', fix: 'Catch it sooner — when you first see griptape' },
      { mistake: 'Board flips away heelside', fix: 'Keep your weight centered, dont lean back' },
      { mistake: 'Cant get the board to flip', fix: 'Your heel needs to actually contact the toe edge of the nose to flick it' }
    ],
    tips: [
      'Heelflips need more pop than kickflips — really snap that tail',
      'Your heel barely moves — tiny flick off the edge',
      'Keep your back foot on longer than you think',
      'Film from the front to see if your heel is actually hitting the edge'
    ],
    progressionTricks: ['varial heelflip', 'inward heel', 'heelflip noseslide', 'heelflip tailslide'],
    videoKeywords: ['heelflip tutorial', 'how to heelflip']
  },

  'tre flip': {
    name: 'Tre Flip (360 Flip)',
    category: 'flip',
    difficulty: 3,
    stance: 'both',
    prerequisites: ['kickflip', 'pop shove-it'],
    description: 'A kickflip combined with a backside 360 pop shove-it. Board flips and rotates 360 degrees.',
    footPosition: {
      front: 'Similar to kickflip but more toward the pocket, slightly more angled',
      back: 'On the tail, back foot positioned to scoop backside'
    },
    steps: [
      'Set up like a kickflip with back foot ready to scoop',
      'Pop and scoop backside simultaneously',
      'Flick your front foot for the flip as you scoop',
      'Let both motions happen at the same time',
      'Board should flip AND spin 360 under you',
      'Watch for the grip tape after one full rotation',
      'Catch clean, stomp it'
    ],
    commonMistakes: [
      { mistake: 'Flip and scoop dont sync', fix: 'Practice the scoop and flip motion slowly first — they happen AT THE SAME TIME' },
      { mistake: 'Only gets 180', fix: 'Your scoop needs more power — really dig the back foot around' },
      { mistake: 'Board flips but doesnt rotate', fix: 'More scoop — the scoop drives the rotation, the flip happens naturally' },
      { mistake: 'Going forward or backward too much', fix: 'Stay directly above the board throughout' }
    ],
    tips: [
      'Land with your weight slightly forward — tres tend to shoot back',
      'Back foot does most of the work — powerful scoop',
      'Dont think about the flip too much — if your ollie and scoop are right, it happens',
      'Tres take hundreds of attempts — dont give up'
    ],
    progressionTricks: ['backside 360 flip', 'switch tre flip', 'fakie tre flip'],
    videoKeywords: ['360 flip tutorial', 'tre flip tips', 'how to tre flip']
  },

  'pop shove-it': {
    name: 'Pop Shove-It',
    category: 'flatground',
    difficulty: 1,
    stance: 'both',
    prerequisites: ['ollie'],
    description: 'The board rotates 180 degrees backside without your body rotating. Simple and satisfying.',
    footPosition: {
      front: 'Normal ollie position or slightly back',
      back: 'On the tail, angled slightly to scoop backside'
    },
    steps: [
      'Set up like an ollie',
      'Pop the tail and scoop it backside (toward your heels)',
      'Let your feet come off the board as it spins',
      'The board rotates 180 degrees under you',
      'Catch when you see grip tape',
      'Roll away'
    ],
    commonMistakes: [
      { mistake: 'Only getting 90 degrees', fix: 'More scoop — dig your back foot around more aggressively' },
      { mistake: 'Board shoots forward', fix: 'Keep your front foot over the board longer' },
      { mistake: 'Landing in the middle', fix: 'Wait for the full rotation before catching' }
    ],
    tips: [
      'Keep your weight centered — dont lean back',
      'Front foot barely moves — mostly back foot action',
      'Great trick to learn before kickflips — teaches the scoop motion'
    ],
    progressionTricks: ['backside pop shove-it', 'tre flip', 'varial kickflip', 'hardflip'],
    videoKeywords: ['pop shove it tutorial', 'backside shove it']
  },

  'frontside 180': {
    name: 'Frontside 180',
    category: 'flatground',
    difficulty: 2,
    stance: 'both',
    prerequisites: ['ollie'],
    description: 'You and the board rotate 180 degrees frontside together.',
    footPosition: {
      front: 'Normal ollie position',
      back: 'Normal tail position'
    },
    steps: [
      'Crouch and wind up your shoulders backside',
      'Pop and unwind your shoulders frontside',
      'Your body and board rotate together 180',
      'Land fakie',
      'Roll out or fakie ollie out'
    ],
    commonMistakes: [
      { mistake: 'Only getting 90 degrees', fix: 'Wind up more before you pop — your shoulders need to turn the board' },
      { mistake: 'Landing heelside', fix: 'Keep weight centered throughout the rotation' },
      { mistake: 'Board and body desync', fix: 'Your shoulders lead — body and board rotate together' }
    ],
    tips: [
      'Use your arms for momentum — swing them around',
      'Look over your shoulder to spot your landing',
      'Easier to learn going into a curb or small ramp first'
    ],
    progressionTricks: ['frontside 360', 'fs 180 kickflip', 'frontside noseslide'],
    videoKeywords: ['frontside 180 tutorial', 'fs180 skateboarding']
  },

  'backside 180': {
    name: 'Backside 180',
    category: 'flatground',
    difficulty: 2,
    stance: 'both',
    prerequisites: ['ollie'],
    description: 'You and the board rotate 180 degrees backside. Lands switch.',
    footPosition: {
      front: 'Normal ollie position',
      back: 'Normal tail, ready to scoop backside'
    },
    steps: [
      'Wind up shoulders frontside',
      'Pop and rotate backside',
      'Board and body turn 180 together',
      'Land switch, stomp it'
    ],
    commonMistakes: [
      { mistake: 'Landing heelside', fix: 'Stay over the board and keep weight centered' },
      { mistake: 'Body does 180 but board stays', fix: 'Your feet need to guide the board — keep them on the board during rotation' }
    ],
    tips: [
      'Look at where youre landing',
      'Backside 180 is often easier than frontside',
      'Great to learn on a bank or going fakie'
    ],
    progressionTricks: ['bs 180 nosegrind', 'backside 360', 'bs 180 heelflip'],
    videoKeywords: ['backside 180 tutorial', 'bs180']
  },

  // ========== GRINDS ==========

  '50-50': {
    name: '50-50 Grind',
    category: 'grind',
    difficulty: 2,
    stance: 'both',
    prerequisites: ['ollie'],
    description: 'Both trucks grind on an obstacle. The most basic grind.',
    footPosition: {
      front: 'Normal, slightly back from bolts',
      back: 'On the tail'
    },
    steps: [
      'Approach the obstacle at a slight angle or straight',
      'Ollie up to the obstacle',
      'Land with both trucks on the ledge/rail',
      'Keep your weight centered between both trucks',
      'Grind to the end',
      'Pop off or roll off'
    ],
    commonMistakes: [
      { mistake: 'Slipping out', fix: 'Make sure you lock in with BOTH trucks — dont land with just one' },
      { mistake: 'Not getting on the obstacle', fix: 'Ollie higher — you need to clear the height of the obstacle' },
      { mistake: 'Falling forward', fix: 'Keep your weight over your back truck, slightly back' }
    ],
    tips: [
      'Wax the obstacle if its rough concrete',
      'Learn on a low curb or parking block first',
      'Look at the end of the obstacle while grinding'
    ],
    progressionTricks: ['5-0 grind', 'nosegrind', 'boardslide', '50-50 to fakie'],
    videoKeywords: ['50-50 grind tutorial', 'how to 50-50']
  },

  '5-0': {
    name: '5-0 Grind',
    category: 'grind',
    difficulty: 2,
    stance: 'both',
    prerequisites: ['ollie', '50-50'],
    description: 'Only the back truck grinds. Front end is raised.',
    footPosition: {
      front: 'Slightly back, ready to keep nose up',
      back: 'On the tail to control the grind'
    },
    steps: [
      'Approach like a 50-50',
      'Ollie and land with only your back truck on the obstacle',
      'Keep your front truck raised above the obstacle',
      'Lean back slightly to maintain the manual position',
      'Grind and pop off at the end'
    ],
    commonMistakes: [
      { mistake: 'Front truck keeps hitting', fix: 'Land further back on the obstacle and lean back more' },
      { mistake: 'Slipping out backside', fix: 'Your weight needs to be directly over the back truck, not behind it' }
    ],
    tips: [
      'Think of it as a nose-up manual on the obstacle',
      'Wax is your friend on 5-0s',
      'Great on ledges — start with something with good wax'
    ],
    progressionTricks: ['5-0 revert', 'nosegrind', '5-0 to nosegrind'],
    videoKeywords: ['5-0 grind tutorial', 'how to five-o']
  },

  'nosegrind': {
    name: 'Nosegrind',
    category: 'grind',
    difficulty: 3,
    stance: 'both',
    prerequisites: ['ollie', '50-50'],
    description: 'Only the front truck grinds. Back end is raised. Opposite of 5-0.',
    footPosition: {
      front: 'Over the front bolts, weight on the nose',
      back: 'Light on the tail'
    },
    steps: [
      'Approach the obstacle',
      'Ollie and lock in only your front truck',
      'Keep your back truck raised',
      'Lean forward to maintain',
      'Pop out at the end'
    ],
    commonMistakes: [
      { mistake: 'Falling forward', fix: 'Dont lean too far — keep weight just barely forward of center' },
      { mistake: 'Back truck keeps landing', fix: 'You need more pop to get the nose down first, then hold the back up' }
    ],
    tips: [
      'Harder than 5-0 — requires precise weight distribution',
      'Start on something with low edges',
      'Good for building up to more technical grinds'
    ],
    progressionTricks: ['nosegrind to fakie', 'crooked grind', 'noseblunt'],
    videoKeywords: ['nosegrind tutorial', 'how to nosegrind']
  },

  'boardslide': {
    name: 'Boardslide',
    category: 'grind',
    difficulty: 2,
    stance: 'both',
    prerequisites: ['ollie'],
    description: 'The board slides perpendicular to the obstacle with the deck on the obstacle.',
    footPosition: {
      front: 'Normal',
      back: 'Normal'
    },
    steps: [
      'Approach the obstacle at a slight angle',
      'Ollie and turn your board 90 degrees so it sits on the obstacle',
      'Both trucks are off the obstacle — just the deck slides',
      'Keep your weight centered over the middle of the board',
      'Slide to the end and turn back',
      'Land and roll away'
    ],
    commonMistakes: [
      { mistake: 'Catching inside edge', fix: 'Make sure you clear the obstacle — you need to land fully ON it, not catch the edge' },
      { mistake: 'Sliding out', fix: 'Wax the obstacle and keep your weight over the center' },
      { mistake: 'Cant turn out', fix: 'Pop your front foot to kick the nose around at the end' }
    ],
    tips: [
      'Wax is essential for boardslides',
      'The 90 degree rotation happens in the air — lock it in as you land',
      'Learn frontside boardslide first — its usually easier'
    ],
    progressionTricks: ['frontside boardslide', 'boardslide to fakie', 'boardslide kickflip out'],
    videoKeywords: ['boardslide tutorial', 'how to boardslide']
  },

  'noseslide': {
    name: 'Noseslide',
    category: 'grind',
    difficulty: 2,
    stance: 'both',
    prerequisites: ['ollie', 'nosegrind'],
    description: 'The nose of the board slides on the obstacle. Front truck locked on, back truck hanging off.',
    footPosition: {
      front: 'Over the nose',
      back: 'Light on the tail'
    },
    steps: [
      'Approach at an angle',
      'Ollie and guide the nose onto the obstacle',
      'Lock the nose onto the obstacle',
      'Keep weight on the front',
      'Slide to the end and pop out'
    ],
    commonMistakes: [
      { mistake: 'Slipping out frontside', fix: 'Keep weight over the nose — dont let it drift' },
      { mistake: 'Hanging up', fix: 'More wax and make sure your nose is fully over the obstacle before sliding' }
    ],
    tips: [
      'Noseslides look really clean — worth the effort',
      'Approach parallel to the obstacle',
      'Pop out with your back foot'
    ],
    progressionTricks: ['noseslide to fakie', 'noseblunt', 'noseslide 270'],
    videoKeywords: ['noseslide tutorial', 'how to noseslide']
  },

  'tailslide': {
    name: 'Tailslide',
    category: 'grind',
    difficulty: 3,
    stance: 'both',
    prerequisites: ['ollie', '5-0'],
    description: 'The tail of the board slides on the obstacle. Back truck locked, front hanging off.',
    footPosition: {
      front: 'Light on the nose',
      back: 'Over the tail'
    },
    steps: [
      'Approach and ollie',
      'Guide the tail onto the obstacle',
      'Lock the tail and keep front end up',
      'Slide and pop out'
    ],
    commonMistakes: [
      { mistake: 'Landing in a 5-0', fix: 'Make sure only the tail/deck is on the obstacle — not the truck' },
      { mistake: 'Falling backside', fix: 'Keep weight balanced — slightly forward to keep from sliding back' }
    ],
    tips: [
      'The approach angle matters a lot',
      'Similar body position to 5-0 but deck on the obstacle',
      'Backside tailslide is usually easier first'
    ],
    progressionTricks: ['tailslide to fakie', 'tailslide kickflip out', 'blunt'],
    videoKeywords: ['tailslide tutorial', 'how to tailslide']
  },

  'crooked grind': {
    name: 'Crooked Grind (Crooks)',
    category: 'grind',
    difficulty: 3,
    stance: 'both',
    prerequisites: ['nosegrind', 'noseslide'],
    description: 'Frontside nosegrind with the board angled. The nose grinds while the board is at an angle.',
    footPosition: {
      front: 'Over the front bolts',
      back: 'Back, keeping weight off the tail'
    },
    steps: [
      'Approach frontside',
      'Ollie and lock the front truck on the obstacle',
      'Board is at roughly 45 degree angle',
      'Grind on the front truck with nose tilted frontside',
      'Pop out at the end'
    ],
    commonMistakes: [
      { mistake: 'Locking into a nosegrind instead', fix: 'Make sure to angle the board — the nose should be pointing frontside' },
      { mistake: 'Slipping out', fix: 'Wax and keep weight consistently over the front truck' }
    ],
    tips: [
      'One of the best looking grinds',
      'Feels weird at first — the angled position takes getting used to',
      'Popular on ledges and rails'
    ],
    progressionTricks: ['k-grind', 'crooks to fakie', 'crooks kickflip out'],
    videoKeywords: ['crooked grind tutorial', 'crooks grind']
  },

  'smith grind': {
    name: 'Smith Grind',
    category: 'grind',
    difficulty: 3,
    stance: 'both',
    prerequisites: ['50-50', '5-0'],
    description: 'Back truck grinds, front truck hangs off the backside of the obstacle. Looks sick.',
    footPosition: {
      front: 'Slightly back from normal',
      back: 'Over the back truck'
    },
    steps: [
      'Approach backside',
      'Ollie and lock only your back truck on the obstacle',
      'Front truck drops down on the backside of the obstacle',
      'Board is at a diagonal',
      'Grind on the back truck',
      'Pop out at the end'
    ],
    commonMistakes: [
      { mistake: 'Landing in a 5-0', fix: 'Your front truck needs to drop off the backside — let it go over the obstacle' },
      { mistake: 'Slipping out backside', fix: 'Keep weight over the back truck, not behind it' }
    ],
    tips: [
      'Easier on wider obstacles',
      'Wax helps a lot',
      'Switch smith grinds are legendary — progression goal'
    ],
    progressionTricks: ['smith grind to fakie', 'feeble grind', 'smith stall'],
    videoKeywords: ['smith grind tutorial', 'how to smith grind']
  },

  // ========== MANUALS ==========

  'manual': {
    name: 'Manual',
    category: 'manual',
    difficulty: 2,
    stance: 'both',
    prerequisites: ['ollie'],
    description: 'Balance on your back two wheels. The skateboard wheelie.',
    footPosition: {
      front: 'Just behind front bolts',
      back: 'On the tail area'
    },
    steps: [
      'Roll at a comfortable speed',
      'Shift weight to your back foot to lift the front wheels',
      'Find the balance point — nose slightly up',
      'Use small front foot adjustments to stay balanced',
      'Roll as long as you can',
      'Shift weight forward to bring front wheels down'
    ],
    commonMistakes: [
      { mistake: 'Tail keeps hitting', fix: 'Youre too far back — the balance point is nose barely up, not the tail dragging' },
      { mistake: 'Falling forward immediately', fix: 'Youre not lifting the front enough — shift more weight back' },
      { mistake: 'Swerving side to side', fix: 'Straighten your back and use your arms for balance' }
    ],
    tips: [
      'Practice over a crack or line on flat ground — keep it between the marks',
      'Slight speed helps a lot — too slow makes it harder',
      'Your arms are like a tightrope walkers pole — use them',
      'The key is tiny constant adjustments, not big movements'
    ],
    progressionTricks: ['nose manual', 'manual to fakie', 'kickflip to manual', 'manual nosegrind'],
    videoKeywords: ['manual tutorial skateboarding', 'how to manual']
  },

  'nose manual': {
    name: 'Nose Manual',
    category: 'manual',
    difficulty: 3,
    stance: 'both',
    prerequisites: ['ollie', 'manual'],
    description: 'Balance on your front two wheels. Reverse of a manual. Harder than regular manual.',
    footPosition: {
      front: 'Over the nose/front bolts',
      back: 'Light on the tail'
    },
    steps: [
      'Ollie up or push front wheels down',
      'Shift weight to your front foot',
      'Back wheels lift off the ground',
      'Balance on front wheels',
      'Adjust constantly with back foot',
      'Bring back wheels down to exit'
    ],
    commonMistakes: [
      { mistake: 'Nose keeps touching down', fix: 'You need more weight on the front — really commit to it' },
      { mistake: 'Falling forward constantly', fix: 'Slight bend in front knee absorbs and corrects' }
    ],
    tips: [
      'Much harder than regular manual for most people',
      'Keep speed up — slow nose manuals are brutal',
      'Film from the side to check your angle'
    ],
    progressionTricks: ['nose manual to regular', 'nollie to nose manual', 'heelflip nose manual'],
    videoKeywords: ['nose manual tutorial', 'how to nose manual']
  },

  // ========== TRANSITION ==========

  'drop in': {
    name: 'Drop In',
    category: 'transition',
    difficulty: 1,
    stance: 'both',
    prerequisites: [],
    description: 'Starting from the top of a ramp or bowl. Psychologically scary, physically simple.',
    footPosition: {
      front: 'On the bolts',
      back: 'On the tail, locking the board to the coping'
    },
    steps: [
      'Place the tail on the coping with back foot',
      'Put your front foot on the bolts',
      'Take a breath',
      'Commit — slam your front foot down and shift all weight forward',
      'Board drops into the ramp',
      'Bend knees and ride down'
    ],
    commonMistakes: [
      { mistake: 'Falling backward', fix: 'You need to commit your weight OVER THE BOARD — leaning back is what causes falls' },
      { mistake: 'Board slides out', fix: 'Make sure the tail is fully locked on the coping before dropping' },
      { mistake: 'Hesitating', fix: 'Hesitation is the enemy — commit 100% or dont go' }
    ],
    tips: [
      'The drop in is 90% mental — once you commit, the body does the rest',
      'Start on the smallest ramp available',
      'Have a friend spot you the first few times',
      'When in doubt, just go'
    ],
    progressionTricks: ['kick turn', 'frontside grind on coping', 'fakie rock'],
    videoKeywords: ['drop in tutorial', 'how to drop in skateboard ramp']
  },

  'kick turn': {
    name: 'Kick Turn',
    category: 'transition',
    difficulty: 1,
    stance: 'both',
    prerequisites: ['drop in'],
    description: 'Pivot 180 degrees on your back truck at the top of the ramp.',
    footPosition: {
      front: 'Normal',
      back: 'Normal'
    },
    steps: [
      'Pump up the ramp',
      'Near the top, shift weight to your back foot',
      'Lift front wheels and pivot your body 180',
      'Board follows your body rotation',
      'Land and pump back down'
    ],
    commonMistakes: [
      { mistake: 'Losing speed', fix: 'Pump as you ride down after the kick turn' },
      { mistake: 'Falling off the side', fix: 'Keep your weight over the board — dont lean sideways' }
    ],
    tips: [
      'Learn to pump first — kick turns require momentum',
      'Look where youre going after the turn',
      'Can also do on flat ground at slow speed'
    ],
    progressionTricks: ['rock to fakie', 'axle stall', 'backside air'],
    videoKeywords: ['kick turn tutorial', 'skateboard kick turn ramp']
  },

  // ========== GRABS ==========

  'melon': {
    name: 'Melon Grab',
    category: 'grab',
    difficulty: 2,
    stance: 'both',
    prerequisites: ['ollie'],
    description: 'Grab the heelside edge of the board between the trucks with your front hand.',
    footPosition: {
      front: 'Normal',
      back: 'Normal'
    },
    steps: [
      'Get air — either off a ramp, hip, or manual pad',
      'In the air, reach your front hand down to grab the heelside',
      'Grab between the trucks',
      'Hold for style',
      'Release and land'
    ],
    commonMistakes: [
      { mistake: 'Reaching too far forward', fix: 'Suck your knees up to your hand — bring the board to you, not you to it' },
      { mistake: 'Losing board control', fix: 'Keep your feet on the board throughout' }
    ],
    tips: [
      'Suck your knees up — the board should come to you',
      'Great on miniramps and banks',
      'Looks clean on transition'
    ],
    progressionTricks: ['indy grab', 'stalefish', 'benihana'],
    videoKeywords: ['melon grab tutorial', 'skateboard grab trick']
  },

  'indy grab': {
    name: 'Indy Grab',
    category: 'grab',
    difficulty: 2,
    stance: 'both',
    prerequisites: ['ollie'],
    description: 'Grab the toeside edge between the trucks with your back hand. Classic.',
    footPosition: {
      front: 'Normal',
      back: 'Normal'
    },
    steps: [
      'Get good air',
      'Reach back hand down to the toeside',
      'Grab between the trucks',
      'Tweak it out for style',
      'Release and land'
    ],
    commonMistakes: [
      { mistake: 'Grabbing outside the trucks', fix: 'The grab should be between the trucks for a real indy' }
    ],
    tips: [
      'One of the most classic grabs — looks great',
      'Indy with a frontside 180 is a solid combo',
      'Tweak by kicking the board out behind you'
    ],
    progressionTricks: ['method grab', 'frontside indy', 'indy 540'],
    videoKeywords: ['indy grab tutorial', 'indie grab skateboarding']
  },

  // ========== STREET FUNDAMENTALS ==========

  'fakie ollie': {
    name: 'Fakie Ollie',
    category: 'flatground',
    difficulty: 2,
    stance: 'both',
    prerequisites: ['ollie'],
    description: 'An ollie while riding fakie (backwards). Good for combos and ramp skating.',
    footPosition: {
      front: 'Over nose (which is now at the back)',
      back: 'On the tail (which is now at the front)'
    },
    steps: [
      'Roll fakie at comfortable speed',
      'Ollie as normal but everything is reversed',
      'Pop the tail (behind you when fakie)',
      'Slide your other foot',
      'Land and ride away'
    ],
    commonMistakes: [
      { mistake: 'Losing balance when rolling fakie', fix: 'Practice rolling fakie first without doing the trick' },
      { mistake: 'Not popping hard enough', fix: 'Fakie takes more commitment — pop hard' }
    ],
    tips: [
      'The motion is exactly the same as a regular ollie — just feels different',
      'Good to practice on a bank rolling down fakie',
      'Essential for ramp skating'
    ],
    progressionTricks: ['fakie kickflip', 'fakie heelflip', 'fakie flip'],
    videoKeywords: ['fakie ollie tutorial', 'how to fakie ollie']
  },

  'nollie': {
    name: 'Nollie',
    category: 'flatground',
    difficulty: 2,
    stance: 'both',
    prerequisites: ['ollie'],
    description: 'Pop off the nose while riding regular. Like an ollie but using the nose.',
    footPosition: {
      front: 'On the nose, ready to pop',
      back: 'In the middle of the board'
    },
    steps: [
      'Roll at comfortable speed',
      'Pop off the nose with your front foot',
      'Slide your back foot toward the tail',
      'Level out and land'
    ],
    commonMistakes: [
      { mistake: 'Board shoots back', fix: 'Keep your back foot on the board — dont let it drift' },
      { mistake: 'Not getting height', fix: 'Really snap the nose down hard — same commitment as a regular ollie pop' }
    ],
    tips: [
      'Nollies are harder than they look',
      'Essential for opening up nollie flip tricks',
      'Good to practice rolling slowly first'
    ],
    progressionTricks: ['nollie kickflip', 'nollie heelflip', 'nollie flip'],
    videoKeywords: ['nollie tutorial', 'how to nollie']
  },

  'switch ollie': {
    name: 'Switch Ollie',
    category: 'flatground',
    difficulty: 3,
    stance: 'both',
    prerequisites: ['ollie'],
    description: 'Ollie with your non-dominant stance. Everything feels backwards.',
    footPosition: {
      front: 'Opposite of normal — non-dominant side leading',
      back: 'On the tail, non-dominant back foot'
    },
    steps: [
      'Roll switch (opposite stance)',
      'Ollie exactly as you normally would but with opposite feet',
      'Pop and slide',
      'Land and ride away switch'
    ],
    commonMistakes: [
      { mistake: 'Cant get any height', fix: 'Your pop foot is weaker in switch — practice snapping the tail in switch without jumping first' },
      { mistake: 'Board goes sideways', fix: 'Your foot angle matters — film yourself and compare to your regular stance' }
    ],
    tips: [
      'Takes months of practice to feel comfortable in switch',
      'Practice rolling switch everywhere — not just at skate sessions',
      'Switch tricks are worth double the style points'
    ],
    progressionTricks: ['switch kickflip', 'switch heelflip', 'switch fs180'],
    videoKeywords: ['switch ollie tutorial', 'how to skate switch']
  },

  'hardflip': {
    name: 'Hardflip',
    category: 'flip',
    difficulty: 4,
    stance: 'both',
    prerequisites: ['kickflip', 'frontside pop shove-it'],
    description: 'Kickflip combined with a frontside pop shove-it. Board flips and rotates frontside.',
    footPosition: {
      front: 'Kickflip position, slightly more toward the pocket',
      back: 'On the tail, ready to scoop frontside'
    },
    steps: [
      'Set up like a kickflip',
      'Pop and scoop frontside simultaneously',
      'Flick for the kickflip as you scoop',
      'Let both motions sync',
      'Catch and land'
    ],
    commonMistakes: [
      { mistake: 'Only gets frontside shove', fix: 'You need to actually flick — the kickflip happens WITH the scoop' },
      { mistake: 'Board goes between legs', fix: 'This is normal at first — stay directly above it and be patient' },
      { mistake: 'Cant sync flip and scoop', fix: 'The scoop and flick happen at the exact same moment — practice slowly' }
    ],
    tips: [
      'Arguably harder than a tre flip',
      'The frontside scoop is the key — your back foot digs forward',
      'One of the gnarliest looking flatground tricks'
    ],
    progressionTricks: ['backside 180 hardflip', 'hardflip nosegrind'],
    videoKeywords: ['hardflip tutorial', 'how to hardflip']
  },

  'varial flip': {
    name: 'Varial Flip',
    category: 'flip',
    difficulty: 3,
    stance: 'both',
    prerequisites: ['kickflip', 'pop shove-it'],
    description: 'Kickflip combined with a backside pop shove-it.',
    footPosition: {
      front: 'Kickflip position',
      back: 'Ready to scoop backside'
    },
    steps: [
      'Pop and scoop backside',
      'Simultaneously flick for kickflip',
      'Board rotates 180 and flips',
      'Catch and land'
    ],
    commonMistakes: [
      { mistake: 'Cant sync the motions', fix: 'Practice pop shove-its and kickflips separately until solid, then combine' },
      { mistake: 'Board goes past your feet', fix: 'Stay above the board — dont lean forward' }
    ],
    tips: [
      'Easier than a tre flip for most people',
      'The scoop and flick happen together',
      'Great trick to learn on the way to tre flips'
    ],
    progressionTricks: ['varial heelflip', 'tre flip', 'varial flip nose manual'],
    videoKeywords: ['varial flip tutorial', 'how to varial flip']
  },

  'inward heel': {
    name: 'Inward Heel',
    category: 'flip',
    difficulty: 4,
    stance: 'both',
    prerequisites: ['heelflip', 'frontside pop shove-it'],
    description: 'Heelflip with a frontside pop shove-it. Board heelflips and rotates frontside.',
    footPosition: {
      front: 'Heelflip position',
      back: 'Ready to scoop frontside'
    },
    steps: [
      'Pop and scoop frontside',
      'Kick your heel for the heelflip simultaneously',
      'Board flips and rotates frontside',
      'Catch when you see grip tape',
      'Land'
    ],
    commonMistakes: [
      { mistake: 'Board goes behind you', fix: 'Keep weight forward and over the board throughout' },
      { mistake: 'Only gets shove no flip', fix: 'Really commit to the heel flick — dont let the scoop dominate' }
    ],
    tips: [
      'The "evil twin" of the hardflip',
      'Really satisfying when you land one',
      'Practice on flat and smooth ground first'
    ],
    progressionTricks: ['inward heel to grind'],
    videoKeywords: ['inward heel tutorial', 'how to inward heel']
  },

};

// ========== COACHING FUNCTIONS ==========

export function getTrickCoaching(trickName: string): TrickData | null {
  const normalized = trickName.toLowerCase().trim();
  
  // Direct match
  if (TRICK_DATABASE[normalized]) return TRICK_DATABASE[normalized];
  
  // Fuzzy match
  const keys = Object.keys(TRICK_DATABASE);
  const match = keys.find(k => 
    k.includes(normalized) || normalized.includes(k) ||
    TRICK_DATABASE[k].name.toLowerCase().includes(normalized)
  );
  
  return match ? TRICK_DATABASE[match] : null;
}

export function getTricksByDifficulty(level: 1 | 2 | 3 | 4 | 5): TrickData[] {
  return Object.values(TRICK_DATABASE).filter(t => t.difficulty === level);
}

export function getTricksByCategory(category: TrickData['category']): TrickData[] {
  return Object.values(TRICK_DATABASE).filter(t => t.category === category);
}

export function getProgressionPath(currentTrick: string): string[] {
  const trick = getTrickCoaching(currentTrick);
  return trick?.progressionTricks || [];
}

export function getPrerequisites(trickName: string): string[] {
  const trick = getTrickCoaching(trickName);
  return trick?.prerequisites || [];
}

export function getDifficulty(level: number): string {
  const labels = ['', 'Beginner', 'Intermediate', 'Advanced', 'Expert', 'Pro'];
  return labels[level] || 'Unknown';
}

export function getAllTrickNames(): string[] {
  return Object.values(TRICK_DATABASE).map(t => t.name);
}

export function searchTricks(query: string): TrickData[] {
  const q = query.toLowerCase();
  return Object.values(TRICK_DATABASE).filter(t =>
    t.name.toLowerCase().includes(q) ||
    t.category.includes(q) ||
    t.description.toLowerCase().includes(q)
  );
}

// Skate Bot response generator
export function getSkateBotResponse(question: string): string {
  const q = question.toLowerCase();

  // Trick-specific questions
  for (const [key, trick] of Object.entries(TRICK_DATABASE)) {
    if (q.includes(key) || q.includes(trick.name.toLowerCase())) {
      if (q.includes('wrong') || q.includes('mistake') || q.includes('problem') || q.includes('cant') || q.includes("can't")) {
        const mistakes = trick.commonMistakes;
        return `Common problems with ${trick.name}:\n\n${mistakes.map((m, i) => `${i+1}. ❌ ${m.mistake}\n   ✅ Fix: ${m.fix}`).join('\n\n')}`;
      }
      if (q.includes('tip') || q.includes('advice') || q.includes('help') || q.includes('how')) {
        return `Tips for ${trick.name}:\n\n${trick.tips.map((t, i) => `${i+1}. ${t}`).join('\n')}`;
      }
      if (q.includes('foot') || q.includes('position') || q.includes('setup')) {
        return `${trick.name} foot position:\n\n👟 Front foot: ${trick.footPosition.front}\n\n👟 Back foot: ${trick.footPosition.back}`;
      }
      if (q.includes('step') || q.includes('how to')) {
        return `How to ${trick.name}:\n\n${trick.steps.map((s, i) => `${i+1}. ${s}`).join('\n')}`;
      }
      if (q.includes('next') || q.includes('after') || q.includes('progression')) {
        const prog = trick.progressionTricks;
        return `After learning ${trick.name}, try:\n\n${prog.map(t => `• ${t}`).join('\n')}`;
      }
      // General info
      return `${trick.name} (Difficulty: ${getDifficulty(trick.difficulty)})\n\n${trick.description}\n\n💡 Key tip: ${trick.tips[0]}`;
    }
  }

  // General questions
  if (q.includes('beginner') || q.includes('start') || q.includes('first trick')) {
    return "Best tricks to learn first:\n\n1. Ollie - foundation of everything\n2. Manual - balance and control\n3. Pop Shove-It - teaches the scoop\n4. Frontside/Backside 180 - body rotation\n5. Boardslide - first grind\n\nMaster the ollie first. Everything else builds on it.";
  }

  if (q.includes('sore') || q.includes('ankle') || q.includes('hurt') || q.includes('pain')) {
    return "Injury prevention tips:\n\n1. Always stretch before skating\n2. Land with bent knees - never straight legs\n3. Learn to bail safely - roll off the board\n4. Wear appropriate shoes - not random sneakers\n5. Skate at your level - dont rush progression\n6. Rest when you need to - overtraining causes injuries\n\nIf you're in pain, stop and rest. No trick is worth a permanent injury.";
  }

  if (q.includes('board') || q.includes('deck') || q.includes('size') || q.includes('setup')) {
    return "Board setup basics:\n\n🛹 Deck: 8.0-8.5 is standard for most. Street = smaller, vert/bowl = bigger\n🔩 Trucks: Match your deck width\n🛞 Wheels: 52-54mm for street, 56mm+ for cruising\n🔴 Bearings: ABEC 7 or Reds are fine\n📏 Tighten trucks to preference - looser = more turn, tighter = more stable";
  }

  if (q.includes('improve') || q.includes('better') || q.includes('progress')) {
    return "How to improve faster:\n\n1. Skate consistently - 3-4 times per week beats marathon sessions\n2. Film yourself - you cant see your own mistakes otherwise\n3. Skate with better skaters - you level up by watching and trying\n4. Focus on one trick at a time - dont jump around\n5. Land a trick 10 times in a row before moving on\n6. Stretch and warm up - fresh body = better skating";
  }

  if (q.includes('fear') || q.includes('scared') || q.includes('nervous') || q.includes('commit')) {
    return "On commitment and fear:\n\nFear is normal. Every skater has been there.\n\nThe truth: hesitation causes more injuries than committing does. When you half-commit, your body does weird things.\n\nTips:\n1. Visualize landing it before you go\n2. Start on smaller obstacles\n3. Have a buddy nearby for confidence\n4. Commit 100% or dont go\n5. Accept that you will fall - and thats ok\n\nYou learn more from a good slam than 100 hesitations.";
  }

  // Default
  return "Ask me about any specific trick - I can help with foot position, common mistakes, tips, or what to learn next. Try asking things like:\n\n• 'Why can't I land my kickflip?'\n• 'What are the steps for a tre flip?'\n• 'What tricks should I learn after ollie?'\n• 'Kickflip foot position'\n\nWhat are you working on?";
}
