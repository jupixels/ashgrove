// The hospital, floor by floor. Maps are grids of 2 m cells (x = column, z = row).
//
// Legend
//   #  wall          .  floor          D  door           H  locker (hide)     Q  payphone (checkpoint)
//   L  ceiling light (needs power on floors with needsPower)   F  flickering light   R  red emergency light
//   B  bed   y  child's bed   G  gurney   O  operating chair   W  wheelchair   c  cupboard
//   m  heart monitor   n  machine   t  tray (knocks over: loud)   g  broken glass (crunches: loud)
//   b  battery   N  note   T  cassette tape   k  keycard   X  blood
//   ^  stairs up   v  stairs down   1-9  monster patrol points
// Things that need more than a letter (consoles, the boiler, Maya's table...) are listed in `objects`.

function grid(w, h, base) {
  const g = Array.from({ length: h }, (_, z) => Array.from({ length: w }, (_, x) => (base && base[z] && base[z][x]) || '#'));
  const api = {
    room(x, z, w, h) { for (let j = z; j < z + h; j++) for (let i = x; i < x + w; i++) g[j][i] = '.'; return api; },
    put(list) { for (const [x, z, ch] of list) g[z][x] = ch; return api; },
    rows() { return g.map((r) => r.join('')); },
  };
  return api;
}

// ---------------------------------------------------------------- 1F: lobby, security office, cafeteria
// The west half is the wing from the prototype (the opening cutscene is staged in it).
const PROTOTYPE = [
  '##############################',
  '#....#..c.m..#..n.c..#...c...#',
  '#....#..B.B..#..B.B..#..b..B.#',
  '#....#...X...#.......#.......#',
  '#....###.######.#######.######',
  '#.L.....F.....L.......F......#',
  '#....X.................X.....#',
  '#....###.######.#######.###.##',
  '#....#.......#.....b.#...#...#',
  '######..B..G.#..X....#...#...#',
  '     #O.t....#..c....#...#.W.#',
  '     #########################',
];

const F1 = grid(46, 16, PROTOTYPE)
  .room(29, 5, 12, 2)            // corridor east
  .room(41, 1, 3, 10)            // stairwell
  .room(31, 1, 6, 3)             // security office
  .room(29, 8, 9, 5)             // cafeteria
  .room(39, 11, 4, 4)            // restroom
  .put([
    [40, 5, 'D'], [40, 6, '#'], [33, 4, 'D'], [31, 7, 'D'], [38, 12, 'D'],
    [42, 1, '^'], [42, 10, 'v'],
    [1, 7, 'Q'],
    [11, 6, 'H'], [26, 5, 'H'], [35, 6, 'H'], [31, 3, 'H'], [34, 12, 'H'],
    [34, 2, 'L'], [31, 10, 'L'], [35, 10, 'L'], [40, 12, 'F'], [42, 5, 'L'], [37, 6, 'F'], [32, 5, 'L'],
    [5, 6, 'R'], [18, 6, 'R'], [30, 6, 'R'], [42, 8, 'R'], [33, 12, 'R'],
    [3, 1, 'N'], [12, 3, 'N'], [32, 1, 'N'], [36, 3, 'T'],
    [36, 9, 't'], [30, 12, 't'], [28, 6, 'g'], [39, 5, 'b'],
    [3, 6, '1'], [20, 5, '2'], [34, 5, '3'], [33, 10, '4'], [16, 9, '5'], [41, 13, '6'],
  ]);

// ---------------------------------------------------------------- B1: morgue and boiler room
const B1 = grid(34, 17)
  .room(1, 1, 4, 4)              // stair landing
  .room(5, 2, 26, 2)             // corridor
  .room(4, 5, 10, 9)             // morgue
  .room(15, 5, 4, 6)             // storage
  .room(20, 5, 10, 10)           // boiler room
  .put([
    [8, 4, 'D'], [16, 4, 'D'], [24, 4, 'D'],
    [2, 1, '^'], [4, 1, 'Q'],
    [10, 2, 'H'], [27, 3, 'H'], [13, 12, 'H'], [29, 13, 'H'],
    [8, 2, 'R'], [19, 3, 'R'], [28, 2, 'R'], [8, 9, 'R'], [25, 13, 'R'],
    [3, 2, 'L'], [14, 2, 'L'], [23, 2, 'L'], [9, 7, 'L'], [24, 7, 'L'], [16, 7, 'L'], [9, 12, 'F'],
    [7, 7, 'O'], [7, 11, 'O'], [10, 7, 't'], [7, 9, 'X'], [12, 11, 'X'], [17, 5, 'c'], [15, 9, 'c'],
    [1, 3, 'N'], [12, 13, 'N'], [21, 13, 'N'], [18, 10, 'T'], [28, 6, 'T'],
    [30, 3, 'b'], [17, 7, 'b'], [21, 3, 'g'], [13, 3, 'g'],
    [6, 3, '1'], [17, 2, '2'], [29, 3, '3'], [9, 9, '4'], [23, 12, '5'], [16, 9, '6'],
  ]);

// ---------------------------------------------------------------- 2F: pediatrics
const F2 = grid(40, 15)
  .room(1, 1, 3, 9)              // stairwell
  .room(4, 4, 34, 2)             // corridor
  .room(5, 1, 6, 2).room(13, 1, 6, 2).room(21, 1, 6, 2).room(29, 1, 8, 2)  // children's rooms, staff room
  .room(5, 7, 9, 6)              // playroom
  .room(16, 7, 6, 4)             // nurse station
  .room(24, 7, 13, 6)            // ward
  .put([
    [7, 3, 'D'], [15, 3, 'D'], [23, 3, 'D'], [31, 3, 'D'], [9, 6, 'D'], [27, 6, 'D'], [33, 6, 'D'],
    [18, 6, '.'], [19, 6, '.'],
    [2, 1, '^'], [2, 9, 'v'], [1, 6, 'Q'],
    [12, 5, 'H'], [30, 4, 'H'], [36, 12, 'H'], [13, 8, 'H'],
    [8, 4, 'L'], [18, 5, 'L'], [28, 4, 'L'], [35, 5, 'L'], [24, 5, 'F'], [9, 9, 'L'], [18, 8, 'L'], [30, 9, 'L'], [26, 10, 'F'], [2, 5, 'L'],
    [6, 1, 'y'], [9, 1, 'y'], [14, 1, 'y'], [17, 1, 'y'], [22, 1, 'y'], [25, 1, 'y'],
    [25, 8, 'y'], [28, 8, 'y'], [31, 8, 'y'], [34, 8, 'y'], [25, 11, 'y'], [28, 11, 'y'], [31, 11, 'y'], [34, 11, 'y'],
    [20, 9, 'k'], [17, 2, 'N'], [35, 1, 'N'], [21, 8, 'N'], [10, 2, 'T'], [7, 12, 'T'],
    [32, 12, 'b'], [5, 2, 'b'], [16, 9, 't'], [22, 5, 'X'], [11, 11, 'X'], [34, 5, 'g'],
    [6, 5, '1'], [20, 4, '2'], [35, 4, '3'], [9, 9, '4'], [30, 10, '5'], [19, 9, '6'],
  ]);

// ---------------------------------------------------------------- 3F: surgery and ICU
const F3 = grid(40, 15)
  .room(1, 1, 3, 9)              // stairwell
  .room(4, 4, 34, 2)             // corridor
  .room(5, 1, 7, 2)              // operating room 1
  .room(14, 1, 7, 2)             // operating room 2
  .room(23, 1, 8, 2)             // Dr. Voss's office
  .room(5, 7, 15, 6)             // ICU
  .room(22, 7, 6, 5)             // storage
  .room(30, 7, 7, 5)             // records
  .put([
    [8, 3, 'D'], [17, 3, 'D'], [26, 3, 'D'], [8, 6, 'D'], [16, 6, 'D'], [24, 6, 'D'], [33, 6, 'D'],
    [2, 1, '^'], [2, 9, 'v'], [1, 6, 'Q'],
    [21, 5, 'H'], [36, 4, 'H'], [19, 12, 'H'], [27, 11, 'H'],
    [6, 4, 'L'], [14, 5, 'L'], [24, 4, 'L'], [32, 5, 'L'], [20, 4, 'F'], [8, 10, 'L'], [14, 10, 'L'], [18, 10, 'F'], [27, 1, 'L'],
    [6, 2, 'L'], [15, 2, 'F'], [33, 9, 'L'], [2, 5, 'L'], [24, 9, 'R'],
    [6, 8, 'B'], [9, 8, 'B'], [12, 8, 'B'], [15, 8, 'B'], [6, 11, 'B'], [9, 11, 'B'], [12, 11, 'B'], [15, 11, 'B'],
    [7, 7, 'm'], [10, 7, 'm'], [13, 7, 'm'], [7, 12, 'm'], [10, 12, 'm'], [13, 12, 'm'],
    [8, 1, 'O'], [17, 1, 'O'], [10, 2, 't'], [19, 2, 't'], [31, 10, 'c'], [35, 7, 'c'],
    [29, 1, 'k'], [24, 2, 'T'], [34, 10, 'T'], [30, 2, 'N'], [32, 8, 'N'], [11, 2, 'N'],
    [27, 9, 'b'], [36, 10, 'b'], [5, 5, 'g'], [26, 5, 'X'], [11, 10, 'X'],
    [6, 5, '1'], [20, 5, '2'], [34, 5, '3'], [10, 10, '4'], [25, 9, '5'], [33, 9, '6'],
  ]);

// ---------------------------------------------------------------- 4F: Ward C
const F4 = grid(36, 14)
  .room(1, 1, 3, 8)              // stairwell
  .room(4, 4, 28, 2)             // corridor
  .room(5, 1, 8, 2).room(15, 1, 8, 2)   // wards
  .room(4, 7, 7, 6).room(24, 7, 7, 6)   // wards
  .room(13, 7, 9, 6)             // operating theatre
  .room(32, 1, 3, 9)             // roof stairwell
  .put([
    [8, 3, 'D'], [18, 3, 'D'], [7, 6, 'D'], [27, 6, 'D'], [17, 6, 'D'],
    [2, 8, 'v'], [33, 1, '^'], [1, 4, 'Q'],
    [12, 5, 'H'], [23, 4, 'H'], [30, 12, 'H'], [10, 8, 'H'],
    [6, 4, 'R'], [16, 5, 'R'], [26, 4, 'R'], [33, 5, 'R'], [7, 9, 'R'], [27, 9, 'R'], [10, 1, 'R'], [20, 1, 'R'], [2, 4, 'R'],
    [6, 1, 'B'], [11, 1, 'B'], [16, 1, 'B'], [21, 1, 'B'], [5, 9, 'B'], [9, 11, 'B'], [25, 9, 'B'], [29, 11, 'B'],
    [14, 9, 't'], [20, 11, 't'], [16, 4, 'X'], [26, 5, 'X'], [19, 9, 'X'], [33, 6, 'X'],
    [20, 8, 'T'], [14, 12, 'N'], [6, 11, 'b'],
    [6, 4, '1'], [16, 4, '2'], [28, 5, '3'], [15, 11, '4'], [7, 10, '5'], [27, 10, '6'],
  ]);

// ---------------------------------------------------------------- roof
const ROOF = grid(20, 12).room(1, 1, 16, 9).put([[2, 1, 'v']]);

// ---------------------------------------------------------------- floor definitions
const yawSouth = Math.PI, yawNorth = 0, yawEast = -Math.PI / 2, yawWest = Math.PI / 2;
const cell = (x, z, yaw) => ({ x: x * 2 + 1, z: z * 2 + 1, yaw });

export const FLOORS = {
  F1: {
    name: 'Ground Floor',
    map: F1.rows(),
    needsPower: true,
    ambience: 'hallway_room_tone',
    arrive: {
      start: { x: 12.4, z: 12.3, yaw: yawEast },          // where the opening cutscene leaves you
      fromBelow: cell(42, 9, yawNorth),
      fromAbove: cell(42, 2, yawSouth),
      elevator: cell(38, 5, yawSouth),
    },
    objects: [
      { type: 'console', x: 34, z: 1 },
      { type: 'vending', x: 24, z: 9 },
      { type: 'exit', x: 2, z: 9 },
      { type: 'elevator', x: 38, z: 4 },
      { type: 'table', x: 31, z: 9 }, { type: 'table', x: 35, z: 9 }, { type: 'table', x: 31, z: 11 },
      { type: 'stall', x: 42, z: 11 }, { type: 'stall', x: 42, z: 12 }, { type: 'stall', x: 42, z: 13, id: 'fakeMaya' },
      { type: 'writing', x: 11, z: 4, face: 'south', text: "DON'T GO TO C" },
      { type: 'writing', x: 18, z: 7, face: 'north', text: 'SHE STILL SINGS' },
      { type: 'writing', x: 36, z: 7, face: 'north', text: 'IT HEARS YOU', phoneOnly: true },
    ],
    notes: [
      { title: 'Visitor sign-in book', text: '10/30/97 — R. Okafor (Ward C)\n10/30/97 — M. Delgado (Ward C)\n10/31/97 — ...\n\nThe last line is in fresh, wet ink:\n\nSAM REYES — 10/31 — WARD C' },
      { title: 'Patient chart #14', text: 'Responding to Continuance treatment.\nHas begun humming at night.\n\nNight staff request transfer off this wing.\nRequest denied. — Dr. E. Voss' },
      { title: 'Security log', text: '10/31/97  02:14\nQuarantine protocol triggered from WARD C. Building sealed.\n\nLockdown can only be lifted from this console with all three Director keycards: RED, BLUE, BLACK.\n\nPower for this console and the upper floors runs through the boiler room in the basement.' },
    ],
    tapes: ['voss_tape_1'],
  },
  B1: {
    name: 'Basement',
    map: B1.rows(),
    needsPower: true,
    ambience: 'morgue_ambience',
    arrive: { fromAbove: cell(2, 2, yawSouth) },
    objects: [
      { type: 'drawers', x: 4, z: 6, rows: 7 },           // morgue drawers along the west wall; drawer 13 is the scare
      { type: 'body', x: 11, z: 9 },                       // Dr. Harlan, with the RED keycard
      { type: 'boiler', x: 25, z: 9 },
      { type: 'lever', x: 20, z: 7 },
      { type: 'writing', x: 14, z: 1, face: 'south', text: 'WALK. DONT RUN.' },
    ],
    notes: [
      { title: 'Maintenance notice', text: 'If main power fails: reset the breaker lever in the BOILER ROOM.\n\nIt is loud. Do not do it alone.' },
      { title: 'Morgue intake', text: '10/29/97 — Dr. A. Harlan (Director).\nCause of death: [scratched out]\n\nPersonal effects: RED keycard, wedding ring.\nEffects left with the body, per Dr. Voss.' },
      { title: 'Scrawled on a clipboard', text: 'it follows SOUND.\n\nwalk. dont run. dont knock anything over.\nhide in the lockers and HOLD YOUR BREATH (Space).\n\nit hates light in its face but dont count on it' },
    ],
    tapes: ['voss_tape_2', 'voss_tape_3'],
  },
  F2: {
    name: 'Pediatrics',
    map: F2.rows(),
    ambience: 'pediatrics_ambience',
    keycard: 'blue',
    arrive: { fromBelow: cell(2, 8, yawNorth), fromAbove: cell(2, 2, yawSouth) },
    objects: [
      { type: 'musicbox', x: 9, z: 11 },
      { type: 'drawing', x: 6, z: 0, face: 'south' }, { type: 'drawing', x: 16, z: 0, face: 'south' },
      { type: 'drawing', x: 11, z: 13, face: 'north' }, { type: 'drawing', x: 30, z: 6, face: 'south' },
      { type: 'writing', x: 14, z: 10, face: 'west', text: 'ITS IN THE CORNER', phoneOnly: true },
      { type: 'writing', x: 20, z: 3, face: 'south', text: 'DONT WIND IT' },
    ],
    notes: [
      { title: "A child's drawing", text: 'the tall man with all the mouths sings to us so we go to sleep.\n\nhe says when the music box plays its time.' },
      { title: 'Nurse station memo', text: "Dir. Mendez keeps her BLUE card in the station desk.\n\nFamilies keep saying photos taken on this floor show 'extra people'.\nIf you don't believe it, look through a camera. (Right-click)" },
      { title: 'Taped to the desk', text: 'If you hear the music box: HIDE.\nDo NOT wind it.' },
    ],
    tapes: ['voss_tape_4', 'voss_tape_6'],
  },
  F3: {
    name: 'Surgery & ICU',
    map: F3.rows(),
    ambience: 'hallway_room_tone',
    keycard: 'black',
    arrive: { fromBelow: cell(2, 8, yawNorth) },
    doors: { '26,3': { code: '1031', label: "Dr. Voss's office" } },
    objects: [
      { type: 'elevator', x: 35, z: 3 },
      { type: 'rubble', x: 2, z: 1 },
      { type: 'writing', x: 21, z: 3, face: 'south', text: '1 0 3 1', phoneOnly: true },
      { type: 'writing', x: 13, z: 6, face: 'north', text: 'HE HEARS THEIR HEARTS' },
    ],
    notes: [
      { title: 'Procedure 31', text: 'Joined patients 9 and 11.\nShared circulation stable.\n\nPatient 11 asked for her mother.\nShe asked in patient 9\'s voice.' },
      { title: "Dr. Voss's desk", text: "I keep forgetting the door code.\nIt is the night it begins again.\n\nI wrote it where only cameras can see." },
      { title: 'Records', text: 'Continuance Program summary\n\nPatients enrolled: 14\nPatients discharged: 0\nHeartbeats recorded: 1' },
    ],
    tapes: ['voss_tape_5', 'voss_tape_7'],
  },
  F4: {
    name: 'Ward C',
    map: F4.rows(),
    ambience: 'hospital_drone',
    arrive: { fromBelow: cell(2, 5, yawEast) },
    objects: [
      { type: 'mayaTable', x: 17, z: 10 },
      { type: 'writing', x: 15, z: 6, face: 'north', text: 'THEATRE' },
      { type: 'writing', x: 31, z: 6, face: 'north', text: 'UP. NOW.', phoneOnly: true },
    ],
    notes: [
      { title: 'Ward C staffing', text: 'Physician: Dr. E. Voss (resident)\nNurses: none\nVisitors: 1 — admitted tonight' },
    ],
    tapes: ['voss_tape_8'],
  },
  ROOF: {
    name: 'Roof',
    map: ROOF.rows(),
    outdoor: true,
    arrive: { fromBelow: cell(2, 2, yawSouth) },
    objects: [
      { type: 'fireEscape', x: 16, z: 5 },
      { type: 'acUnit', x: 6, z: 4 }, { type: 'acUnit', x: 11, z: 7 }, { type: 'tank', x: 13, z: 2 },
    ],
    notes: [],
    tapes: [],
  },
};

// Chapter titles shown when you first arrive somewhere
export const CHAPTERS = {
  1: { title: 'I. Admitted', floor: 'F1' },
  2: { title: 'II. Cold Storage', floor: 'B1' },
  3: { title: 'III. Lullaby', floor: 'F2' },
  4: { title: 'IV. One Heartbeat', floor: 'F3' },
  5: { title: 'V. Leaving So Soon', floor: 'F1' },
  6: { title: 'VI. Ward C', floor: 'F4' },
};

export const TAPE_LINES = {
  voss_tape_1: 'Continuance Program, entry one. Patient fourteen is responding. The body wants to live. It simply needs... help.',
  voss_tape_2: 'Entry two. We shared tissue between patients nine and eleven. Eleven woke up. Nine did not. Eleven speaks with nine\'s voice now.',
  voss_tape_3: 'The night staff have stopped coming to Ward C. They say the patients hum at night. Patients in comas do not hum.',
  voss_tape_4: 'I have joined six of them. They share a heartbeat now. When one sleeps, the others watch. They are never all asleep.',
  voss_tape_5: 'It asked for me today. Not by name. It used the voice of a nurse who left us in March. I have not told the board.',
  voss_tape_6: 'The children\'s ward is closed. I won\'t write down why. If you hear the music box, do not go towards it.',
  voss_tape_7: 'The quarantine protocol is ready. If it gets out of Ward C, the building seals itself. Nobody leaves. Not even me.',
  voss_tape_8: 'If anyone finds this... I didn\'t run. I\'m still here. I\'m all of them now. And they\'re so very hungry.',
};
export const TAPE_COUNT = Object.keys(TAPE_LINES).length;
