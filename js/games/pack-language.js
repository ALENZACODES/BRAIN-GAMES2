// Concepts 161–180: language and numerical reasoning.
import { std } from '../play.js';
import { tok, card, barChart, pie, mc, numOpts, yesNo, HUES, COLORS, range, sum, gcd } from '../gfx.js';

const W3 = 'ace act add age ago aid aim air ale all and ant any ape apt arc are ark arm art ash ask ate awe axe bad bag ban bar bat bay bed bee beg bet bid big bin bit bog bow box boy bud bug bun bus but buy cab can cap car cat cod cog cot cow cub cue cup cut dab dad dam day den dew did die dig dim din dip doe dog dot dry dub dud due dug dye ear eat ebb egg ego elf elk elm end era eve ewe eye fad fan far fat fax fed fee few fig fin fir fit fix fly foe fog for fox fry fun fur gag gap gas gel gem get gig gin gnu god got gum gun gut guy gym had hag ham has hat hay hem hen her hew hid him hip his hit hog hop hot how hub hue hug hum hut ice icy ill imp ink inn ion ire irk its ivy jab jam jar jaw jet jig job jog jot joy jug jut keg ken key kid kin kit lab lad lag lap law lax lay led leg let lid lie lip lit log lot low lug mad man map mar mat maw may men met mid mix mob mop mud mug nab nag nap net new nil nip nod nor not now nun nut oak oar oat odd ode off oft oil old one opt orb ore our out owe owl own pad pal pan par pat paw pay pea peg pen pet pie pig pin pit ply pod pop pot pro pry pub pug pun pup put rag ram ran rap rat raw ray red rib rid rig rim rip rob rod roe rot row rub rug rum run rut rye sad sag sap sat saw say sea set sew she shy sin sip sir sis sit six ski sky sly sob sod son sow soy spa spy sty sub sum sun sup tab tad tag tan tap tar tax tea ten the tie tin tip toe ton too top tot tow toy try tub tug two urn use van vat vet vex via vie vow wad wag war was wax way web wed wet who why wig win wit woe wok won woo wow yak yam yap yaw yen yes yet yew you zap zen zip zoo'.split(' ');
const CATS = {
  Fruits: ['apple', 'banana', 'cherry', 'grape', 'lemon', 'lime', 'mango', 'melon', 'orange', 'peach', 'pear', 'plum', 'kiwi', 'fig', 'date', 'apricot', 'papaya', 'guava', 'lychee', 'coconut', 'pineapple', 'strawberry', 'raspberry', 'blueberry', 'blackberry', 'cranberry', 'grapefruit', 'nectarine', 'pomegranate', 'tangerine', 'watermelon', 'avocado', 'olive', 'quince', 'persimmon', 'passion fruit', 'clementine', 'mandarin', 'gooseberry', 'currant'],
  Animals: ['cat', 'dog', 'horse', 'cow', 'pig', 'sheep', 'goat', 'lion', 'tiger', 'bear', 'wolf', 'fox', 'deer', 'moose', 'rabbit', 'mouse', 'rat', 'squirrel', 'beaver', 'otter', 'seal', 'whale', 'dolphin', 'shark', 'eagle', 'owl', 'hawk', 'duck', 'goose', 'swan', 'frog', 'toad', 'snake', 'lizard', 'turtle', 'elephant', 'giraffe', 'zebra', 'camel', 'monkey', 'gorilla', 'kangaroo', 'koala', 'panda', 'raccoon', 'skunk', 'bat', 'hedgehog', 'badger', 'lynx'],
  Colours: ['red', 'blue', 'green', 'yellow', 'orange', 'purple', 'pink', 'brown', 'black', 'white', 'grey', 'gray', 'violet', 'indigo', 'teal', 'turquoise', 'maroon', 'navy', 'beige', 'cream', 'gold', 'silver', 'crimson', 'scarlet', 'magenta', 'cyan', 'lime', 'olive', 'lavender', 'lilac', 'coral', 'salmon', 'tan', 'khaki', 'amber', 'ivory', 'charcoal', 'burgundy', 'mauve', 'peach'],
  'Body parts': ['head', 'hair', 'eye', 'ear', 'nose', 'mouth', 'lip', 'tooth', 'tongue', 'chin', 'cheek', 'neck', 'shoulder', 'arm', 'elbow', 'wrist', 'hand', 'finger', 'thumb', 'nail', 'chest', 'back', 'stomach', 'hip', 'leg', 'knee', 'ankle', 'foot', 'toe', 'heel', 'heart', 'lung', 'liver', 'kidney', 'brain', 'skin', 'bone', 'muscle', 'forehead', 'eyebrow'],
  'Kitchen items': ['pan', 'pot', 'kettle', 'spoon', 'fork', 'knife', 'plate', 'bowl', 'cup', 'mug', 'glass', 'oven', 'stove', 'fridge', 'freezer', 'toaster', 'blender', 'whisk', 'ladle', 'spatula', 'grater', 'sieve', 'colander', 'tray', 'jug', 'teapot', 'kettle', 'microwave', 'dishwasher', 'sink', 'tap', 'apron', 'oven mitt', 'rolling pin', 'peeler', 'tongs', 'can opener', 'cutting board', 'napkin', 'saucepan'],
  Countries: ['canada', 'mexico', 'brazil', 'peru', 'chile', 'argentina', 'france', 'spain', 'italy', 'germany', 'poland', 'greece', 'egypt', 'kenya', 'nigeria', 'ghana', 'morocco', 'india', 'china', 'japan', 'korea', 'vietnam', 'thailand', 'nepal', 'iran', 'iraq', 'turkey', 'russia', 'norway', 'sweden', 'finland', 'denmark', 'ireland', 'portugal', 'austria', 'australia', 'fiji', 'cuba', 'jamaica', 'colombia', 'pakistan', 'israel', 'jordan', 'lebanon', 'iceland'],
};
const HOMO = [['bank', 'We sat on the bank and watched the ducks drift past.', 'the land beside a river', ['a place that keeps money', 'to tilt an aeroplane', 'a row of switches']], ['bat', 'He swung the bat and the ball flew over the fence.', 'a club used to hit a ball', ['a flying mammal', 'to blink', 'a quick hit of the eyelashes']],
  ['bark', 'The bark of the old oak was rough and grey.', 'the outer covering of a tree', ['the sound a dog makes', 'a sailing ship', 'to speak sharply']], ['spring', 'The mattress had a broken spring that squeaked.', 'a coil of metal that bounces back', ['the season after winter', 'a natural water source', 'a sudden jump']],
  ['match', 'She struck a match to light the candle.', 'a small stick that makes a flame', ['a sports game', 'a perfect pair', 'to be the same as']], ['pitch', 'The singer found the right pitch before the song.', 'how high or low a sound is', ['a sports field', 'to throw', 'a sales speech']],
  ['seal', 'Break the seal before opening the jar.', 'something that closes a container tightly', ['a sea animal', 'an official stamp', 'to finalise a deal']], ['bolt', 'Lightning came down in a single bright bolt.', 'a flash of lightning', ['a metal fastener', 'to run away suddenly', 'a roll of fabric']],
  ['fair', 'The referee made a fair decision.', 'just and reasonable', ['an outdoor festival', 'light in colour', 'fine weather']], ['mine', 'The old mine was closed after the gold ran out.', 'a place where minerals are dug up', ['belonging to me', 'an explosive device', 'to dig for ore']],
  ['crane', 'A huge crane lifted the steel beam onto the roof.', 'a machine for lifting heavy things', ['a tall wading bird', 'to stretch your neck', 'a paper figure']], ['scale', 'Each scale on the fish shimmered in the light.', 'a small plate on a fish’s skin', ['a device for weighing', 'a series of musical notes', 'to climb up']],
  ['current', 'The current pulled the raft toward the rocks.', 'the flow of water', ['happening now', 'electric charge flowing', 'a small dried fruit']], ['ring', 'Did you hear the phone ring?', 'to make a bell-like sound', ['a band worn on a finger', 'a boxing area', 'a circle']],
  ['lead', 'The pipes were made of lead long ago.', 'a heavy grey metal', ['to guide others', 'being in first place', 'a dog’s leash']], ['row', 'The neighbours had a loud row about the hedge.', 'a noisy argument', ['a line of things', 'to move a boat with oars', 'a line of seats']]];
const SENTS = ['The old lighthouse | guided the fishing boats | safely into the harbour | every stormy night.', 'After the long winter, | the farmers planted | barley and oats | in the north field.', 'Because the bridge was closed, | the delivery truck | took the mountain road | and arrived late.',
  'Most of the visitors | stayed in the museum | until the gift shop | closed at six.', 'The curious kitten | climbed onto the bookshelf | and knocked over | a vase of tulips.', 'When the bell rang, | the students packed their bags | and walked quietly | to the bus stop.',
  'Our team tested | three different designs | before choosing | the lightest one.', 'Although it was raining, | the market stayed open | and the bakers | sold out by noon.', 'The scientist recorded | the temperature | every hour | for a whole week.', 'Each morning | my grandfather walks | to the corner shop | for a newspaper.',
  'If the battery runs low, | the robot returns | to its charging station | on its own.', 'The choir practised | the new song | in the empty hall | until midnight.', 'Hidden under the floorboards, | the children found | a rusty tin | full of old coins.', 'The library will lend | each member | up to five books | at a time.'];
const CONCISE = [[['Hi team,', 1], ['just a quick reminder that', 0], ['the meeting moves to 3 pm', 1], ['on Thursday', 1], ['as I think I may have mentioned before,', 0], ['in Room 4.', 1], ['Thanks so much and have a great day!', 0]],
  [['Please note that', 0], ['the pool closes', 1], ['for cleaning', 1], ['this coming Monday', 1], ['which I know is a bit annoying,', 0], ['and reopens Tuesday at 7 am.', 1], ['Sorry about that, everyone.', 0]],
  [['Hello! I hope you are well.', 0], ['Your order #4471', 1], ['has shipped', 1], ['and, all being well and if everything goes to plan,', 0], ['should arrive Friday.', 1], ['Let me know if you have any questions at all.', 0]],
  [['So basically,', 0], ['the fire drill', 1], ['is at 10 am', 1], ['tomorrow,', 1], ['and it should be pretty quick, I think,', 0], ['so please leave by the east stairs.', 1], ['Cheers!', 0]],
  [['Quick update:', 0], ['the bus to the zoo', 1], ['leaves from the main gate', 1], ['at 8:15', 1], ['sharp, and I really do mean sharp, honestly,', 0], ['so bring a packed lunch.', 1]]];
const AMBIG = [['I saw the man with the telescope.', 'I used the telescope to see the man.', ['I saw the man.', 'I saw the man and a telescope with the telescope.', 'With the telescope, the man saw.']], ['Visiting relatives can be boring.', 'It can be boring to visit relatives.', ['Relatives visiting can be visiting.', 'Boring relatives visit.', 'Visiting can be boring relatives.']],
  ['Mira told Tess that she had won.', 'Mira told Tess, “I have won.”', ['Mira told Tess that she, Tess, maybe won.', 'She told her that she had won.', 'Mira and Tess won, she told.']], ['The chicken is ready to eat.', 'The chicken has been cooked and is ready to be eaten.', ['The chicken is ready.', 'The chicken is hungry and ready to eat.', 'Ready to eat is the chicken.']],
  ['We need more experienced teachers.', 'We need a larger number of experienced teachers.', ['We need teachers.', 'More, we need experienced teachers.', 'We need experienced more teachers.']], ['The children were told to stop playing on the stairs.', 'On the stairs, the children were told to stop playing.', ['The children stopped.', 'The stairs told the children to stop.', 'Playing children were stairs.']],
  ['Every student read a book.', 'Every student read the same single book.', ['Students read.', 'A book read every student.', 'Each book was a student.']], ['They are hunting dogs.', 'Those animals are dogs bred for hunting.', ['They hunt.', 'Dogs are they hunting.', 'They are dogs.']]];
const REL = { young: [['puppy', 'dog'], ['kitten', 'cat'], ['calf', 'cow'], ['foal', 'horse'], ['cub', 'bear']], part: [['petal', 'flower'], ['wheel', 'car'], ['page', 'book'], ['key', 'keyboard'], ['branch', 'tree']], tool: [['brush', 'painter'], ['scalpel', 'surgeon'], ['baton', 'conductor'], ['trowel', 'mason'], ['needle', 'tailor']],
  opposite: [['hot', 'cold'], ['early', 'late'], ['ascend', 'descend'], ['generous', 'stingy'], ['victory', 'defeat']], home: [['bee', 'hive'], ['bird', 'nest'], ['horse', 'stable'], ['spider', 'web'], ['fox', 'den']], degree: [['warm', 'hot'], ['damp', 'soaked'], ['tired', 'exhausted'], ['big', 'enormous'], ['glad', 'ecstatic']] };
const RELN = { young: 'young of', part: 'part of', tool: 'tool of', opposite: 'opposite of', home: 'home of', degree: 'stronger form' };
const TASKS = [['Send a parcel', [['Pack the item', []], ['Seal the box', [0]], ['Write the address', [1]], ['Weigh the box', [1]], ['Pay for postage', [3]], ['Hand it to the clerk', [2, 4]]]],
  ['Make a cup of tea', [['Fill the kettle', []], ['Boil the water', [0]], ['Put a tea bag in the cup', []], ['Pour in the water', [1, 2]], ['Wait three minutes', [3]], ['Remove the tea bag', [4]]]],
  ['Plant a tree', [['Choose a spot', []], ['Dig a hole', [0]], ['Place the tree in the hole', [1]], ['Fill the hole with soil', [2]], ['Water the tree', [3]]]],
  ['Change a bike tyre', [['Remove the wheel', []], ['Take off the old tyre', [0]], ['Fit the new tyre', [1]], ['Pump it up', [2]], ['Refit the wheel', [3]]]],
  ['Print a document', [['Turn on the printer', []], ['Load paper', []], ['Open the document', []], ['Choose Print', [2]], ['Select the printer', [0, 3]], ['Collect the pages', [1, 4]]]]];
const PASS = [['Honeybees communicate the location of flowers with a “waggle dance”. The angle of the dance shows the direction relative to the sun, and its length shows distance. Other bees watch and then fly straight to the food.', 'Bees use a dance to tell others where food is.', ['Bees like flowers.', 'The sun is important to all insects.', 'Bees dance to attract mates.']],
  ['Many cities now plant trees along busy streets. The shade lowers pavement temperatures in summer, and leaves trap some dust from traffic. Residents also report that tree-lined streets feel calmer.', 'Street trees bring several benefits to cities.', ['Traffic causes dust.', 'Summers are getting hotter.', 'People should move to the countryside.']],
  ['Before refrigerators, people stored food in ice houses: insulated buildings packed with winter ice. Straw and thick walls slowed melting so well that ice could last into late summer.', 'Ice houses kept food cold before refrigerators.', ['Straw is a good building material.', 'Winters used to be colder.', 'Refrigerators are expensive.']],
  ['A library in Oslo lends tools as well as books. Members can borrow drills, ladders and sewing machines for a week. Staff say it saves residents money and reduces waste.', 'The library lends tools to save money and waste.', ['Oslo has many libraries.', 'Drills are expensive.', 'People rarely read books now.']],
  ['Octopuses can change colour in a fraction of a second. Special skin cells expand or shrink to show different pigments. They use this to hide from predators and to signal to other octopuses.', 'Octopuses change colour quickly to hide and to signal.', ['Octopuses have eight arms.', 'Predators are dangerous in the sea.', 'Skin cells are very small.']],
  ['Some schools have moved their start time later for teenagers. Studies at those schools found students slept longer and were late less often. Grades in early classes also improved slightly.', 'Later start times helped teenage students in several ways.', ['Teenagers like sleeping.', 'Grades always improve with time.', 'Schools should be shorter.']]];
const EVID = [['The town’s new bike lanes reduced car trips.', 'After the lanes opened, a traffic count showed 12% fewer cars on the same streets.', ['Many residents said they liked the colour of the lanes.', 'The lanes cost less than a new road would have.', 'Bike shops reported selling more helmets.']],
  ['The plant grows faster in blue light.', 'Two identical plants were grown side by side; the one under blue light grew 4 cm more in a month.', ['Blue is a popular colour for grow lamps.', 'The plant comes from a sunny country.', 'The gardener prefers blue light.']],
  ['The bakery’s new oven saves energy.', 'Its electricity bill fell by a fifth after the swap, while baking the same number of loaves.', ['The new oven is quieter.', 'Customers said the bread tastes better.', 'The oven was on sale.']],
  ['Reading aloud improves memory for a list.', 'In a test, people who read a list aloud recalled 3 more words on average than people who read it silently.', ['Reading aloud is common in schools.', 'Some people enjoy hearing their own voice.', 'Lists are useful for shopping.']],
  ['The river is cleaner than ten years ago.', 'Water samples show pollution levels have dropped by half since 2015.', ['More people swim in summer now.', 'The river looks blue on sunny days.', 'A new park opened by the river.']],
  ['The library’s late-night hours are popular.', 'Visits between 8 and 10 pm have doubled since the change, according to door counters.', ['The library has comfortable chairs.', 'Students often study late.', 'The building has good lighting.']]];

const frac = (n, d) => { const g = gcd(n, d); return `${n / g}/${d / g}`; };
const mixed = (x) => { const w = Math.floor(x + 1e-9), r = x - w; const F = [[0, ''], [0.25, '¼'], [1 / 3, '⅓'], [0.5, '½'], [2 / 3, '⅔'], [0.75, '¾']]; const f = F.find(([v]) => Math.abs(v - r) < 1e-6); return f ? `${w || (f[1] ? '' : '0')}${f[1]}` : x.toFixed(2); };

export const G = [
  std({ num: 161, title: 'Word Ladder', max: 12,
    how: ['Change the starting word into the target word, one letter at a time.', 'Every step must be a real word. At each step, pick the word that moves you closer.', 'Longer ladders as you improve. One wrong step ends the climb.'],
    makeTrial(rng, lv) {
      const S = new Set(W3), nbr = (w) => { const o = []; for (let i = 0; i < 3; i++) for (const ch of 'abcdefghijklmnopqrstuvwxyz') { if (ch === w[i]) continue; const x = w.slice(0, i) + ch + w.slice(i + 1); if (S.has(x)) o.push(x); } return o; };
      const bfs = (a) => { const d = new Map([[a, 0]]), q = [a]; while (q.length) { const x = q.shift(); for (const y of nbr(x)) if (!d.has(y)) { d.set(y, d.get(x) + 1); q.push(y); } } return d; };
      const want = Math.min(6, 2 + Math.floor(lv / 2));
      for (let g = 0; g < 200; g++) {
        const tgt = rng.pick(W3), D = bfs(tgt), starts = [...D].filter(([, v]) => v === want); if (!starts.length) continue;
        let cur = rng.pick(starts)[0]; const steps = []; let bad = false;
        while (cur !== tgt) { const ns = nbr(cur), good = ns.filter((x) => D.get(x) === D.get(cur) - 1), next = rng.pick(good), wrong = ns.filter((x) => D.get(x) >= D.get(cur));
          if (!good.length) { bad = true; break; } const opts = [next, ...rng.sample(wrong, Math.min(2, wrong.length))]; while (opts.length < 3) { const r = rng.pick(W3); if (!opts.includes(r) && !good.includes(r)) opts.push(r); }
          steps.push({ kind: 'choice', prompt: `${cur.toUpperCase()}  →  …  →  ${tgt.toUpperCase()}`, options: rng.shuffle(opts).map((w) => ({ label: w.toUpperCase(), value: w, cls: good.includes(w) && w !== next ? '' : '' })), answer: next, cols: 3, flashMs: 300, alts: good.filter((x) => x !== next) });
          cur = next; }
        if (bad || steps.some((s) => s.alts.length && s.options.some((o) => s.alts.includes(o.value)))) continue;
        steps.forEach((s) => delete s.alts);
        return { kind: 'steps', steps, allowed: 0 };
      }
      throw new Error('ladder gen');
    } }),
  std({ num: 162, title: 'Category Sprint', max: 12, practiceTrials: 1,
    how: ['A category appears. Type as many different members as you can, pressing Enter after each.', 'Repeats and wrong words do not count.', 'You need more words, and later a starting-letter rule, as you improve.'],
    makeTrial(rng, lv) {
      const cat = rng.pick(Object.keys(CATS)), all = [...new Set(CATS[cat])]; let accept = all, label = cat;
      if (lv >= 7) { const counts = {}; all.forEach((w) => (counts[w[0]] = (counts[w[0]] || 0) + 1)); const L_ = rng.pick(Object.keys(counts).filter((k) => counts[k] >= 4)); accept = all.filter((w) => w[0] === L_); label = `${cat} starting with “${L_.toUpperCase()}”`; }
      return { kind: 'typing', prompt: label, accept, need: lv >= 7 ? Math.min(accept.length, 2 + Math.floor((lv - 7) / 2)) : Math.min(12, 3 + lv), timeMs: 45000 + lv * 2000, hint: 'Practice: type a word and press Enter.' };
    } }),
  std({ num: 163, title: 'Meaning in Context', max: 10,
    how: ['A word with several meanings is used in a sentence.', 'Pick the meaning it has HERE.', 'Trickier sentences as you improve.'],
    makeTrial(rng, lv) { const [w, s, m, d] = rng.pick(HOMO); return { kind: 'choice', promptHtml: `<span class="memo">${s.replace(new RegExp(`\\b${w}\\b`, 'i'), (x) => `<b>${x}</b>`)}</span>`, prompt: `Here, “${w}” means…`, options: rng.shuffle([m, ...d]).map((x) => ({ label: x, value: x })), answer: m, cols: 1, timeMs: Math.max(6000, 14000 - lv * 600) }; } }),
  std({ num: 164, title: 'Sentence Repair', max: 12,
    how: ['A sentence has been chopped into pieces and shuffled.', 'Tap the pieces in order to rebuild a clear sentence.', 'Longer sentences as you improve.'],
    makeTrial(rng, lv) { const s = rng.pick(SENTS), parts = s.split(' | '); return { kind: 'order', textItems: true, items: rng.shuffle(parts).map((p) => ({ label: p, value: p })), answer: parts, prompt: 'Rebuild the sentence' }; } }),
  std({ num: 165, title: 'Concise Messenger', max: 10,
    how: ['A message is too wordy. Select the phrases to DELETE.', 'Keep every essential fact: who, what, when, where.', 'The result must fit the word budget. Tighter budgets as you improve.'],
    makeTrial(rng, lv) {
      const m = rng.pick(CONCISE), words = (x) => x.split(' ').length, ess = sum(m.filter((p) => p[1]).map((p) => words(p[0]))), slack = Math.max(0, 4 - Math.floor(lv / 3));
      return { kind: 'multi', promptHtml: `<span class="memo">${m.map((p) => p[0]).join(' ')}</span><span class="rule">Word budget: ${ess + slack}</span>`, items: m.map((p, i) => ({ label: p[0], value: i })), answer: m.map((p, i) => (p[1] ? -1 : i)).filter((i) => i >= 0), prompt: 'Select phrases to delete', cols: 1, msg: m.map((p) => [words(p[0]), p[1]]), budget: ess + slack };
    },
    check(t, resp) { const del = new Set(resp); if (t.msg.some(([, e], i) => e && del.has(i))) return false; return sum(t.msg.filter((_, i) => !del.has(i)).map(([w]) => w)) <= t.budget; } }),
  std({ num: 166, title: 'Ambiguity Detective', max: 10,
    how: ['This sentence can be read in more than one way.', 'Pick the rewrite that says ONE clear thing and keeps the original idea.', 'Subtler ambiguities as you improve.'],
    makeTrial(rng, lv) { const [s, good, bad] = rng.pick(AMBIG); return { kind: 'choice', promptHtml: `<span class="memo">“${s}”</span>`, prompt: 'Clearest rewrite?', options: rng.shuffle([good, ...bad]).map((x) => ({ label: x, value: x })), answer: good, cols: 1 }; } }),
  std({ num: 167, title: 'Analogy Bridge', max: 12,
    how: ['Look at how the two words in capitals are related.', 'Pick the pair that has the SAME relationship.', 'Subtler relationships as you improve.'],
    makeTrial(rng, lv) {
      const keys = Object.keys(REL), r = rng.pick(lv <= 4 ? keys.slice(0, 4) : keys), [p, q] = rng.sample(REL[r], 2), others = rng.sample(keys.filter((k) => k !== r), 3).map((k) => rng.pick(REL[k]));
      return { kind: 'choice', prompt: `${p[0].toUpperCase()} : ${p[1].toUpperCase()}`, options: rng.shuffle([q, ...others]).map((x) => ({ label: `${x[0]} : ${x[1]}`, value: x.join(':') })), answer: q.join(':'), cols: 2, explain: `Both pairs are “${RELN[r]}”.` };
    } }),
  std({ num: 168, title: 'Instruction Builder', max: 10,
    how: ['Write instructions a robot helper can follow: arrange the steps in an order that works.', 'A step can only happen after the steps it depends on.', 'More steps and parallel branches as you improve. Any workable order counts.'],
    makeTrial(rng, lv) { const [g, st] = rng.pick(TASKS); const topo = []; const done = new Set(); while (topo.length < st.length) { const i = st.findIndex((s, j) => !done.has(j) && s[1].every((x) => done.has(x))); done.add(i); topo.push(i); }
      return { kind: 'order', textItems: true, promptHtml: `<span class="rule">Task: ${g}</span>`, items: rng.shuffle(range(st.length)).map((i) => ({ label: st[i][0], value: i })), answer: topo, pre: st.map((s) => s[1]), prompt: 'Order the instructions' }; },
    check(t, r) { const done = new Set(); for (const i of r) { if (!t.pre[i].every((x) => done.has(x))) return false; done.add(i); } return done.size === t.pre.length; } }),
  std({ num: 169, title: 'Main-Idea Finder', max: 10,
    how: ['Read a short passage.', 'Pick the sentence that best sums up the WHOLE passage, not just one detail.', 'Closer decoys as you improve.'],
    makeTrial(rng, lv) { const [p, m, d] = rng.pick(PASS); return { kind: 'choice', promptHtml: `<span class="memo">${p}</span>`, prompt: 'Main idea?', options: rng.shuffle([m, ...d]).map((x) => ({ label: x, value: x })), answer: m, cols: 1 }; } }),
  std({ num: 170, title: 'Evidence Match', max: 10,
    how: ['A claim is made.', 'Pick the piece of information that actually SUPPORTS it, not just something related.', 'More tempting near-misses as you improve.'],
    makeTrial(rng, lv) { const [c, e, d] = rng.pick(EVID); return { kind: 'choice', promptHtml: `<span class="rule">Claim: ${c}</span>`, prompt: 'Which evidence supports the claim?', options: rng.shuffle([e, ...d]).map((x) => ({ label: x, value: x })), answer: e, cols: 1 }; } }),
  std({ num: 172, title: 'Estimate First', max: 12, practiceTrials: 1,
    how: ['First, make a quick estimate: pick the range the answer falls in. You only get a few seconds.', 'Then work out the exact answer.', 'You score when both are right. Bigger numbers as you improve.'],
    makeTrial(rng, lv) {
      const kind = lv <= 4 ? '×' : rng.pick(['×', '×+', '÷']); let a, b, c = 0, ans, txt;
      if (kind === '÷') { b = rng.int(3, 12); ans = rng.int(12, 40 + lv * 10); a = ans * b; txt = `${a} ÷ ${b}`; } else { a = rng.int(11, 30 + lv * 6); b = rng.int(3, 9 + lv); c = kind === '×+' ? rng.int(10, 99) : 0; ans = a * b + c; txt = `${a} × ${b}${c ? ' + ' + c : ''}`; }
      const mag = Math.pow(10, Math.floor(Math.log10(ans))), lo = Math.floor(ans / mag) * mag, bands = [[lo - mag, lo], [lo, lo + mag], [lo + mag, lo + 2 * mag], [lo + 2 * mag, lo + 3 * mag]].filter(([x]) => x >= 0);
      return { kind: 'steps', steps: [{ kind: 'choice', prompt: `Estimate: ${txt}`, options: bands.map(([x, y]) => ({ label: `${x}–${y}`, value: x })), answer: lo, timeMs: Math.max(3000, 6000 - lv * 200), tag: 'estimate' }, { kind: 'numeric', prompt: `Exact: ${txt} = ?`, answer: ans, tag: 'exact' }], allowed: 0 };
    } }),
  std({ num: 174, title: 'Percentage Transformer', max: 12,
    how: ['A value is shown as a fraction, decimal, percentage or picture.', 'Pick the option that is worth exactly the same.', 'Less familiar values as you improve.'],
    makeTrial(rng, lv) {
      const V = lv <= 4 ? [[1, 2], [1, 4], [3, 4], [1, 5], [1, 10], [2, 5]] : [[1, 8], [3, 8], [1, 3], [2, 3], [3, 5], [7, 10], [5, 8], [1, 20], [3, 20], [9, 25]];
      const [n, d] = rng.pick(V), val = n / d, fmt = { frac: () => `${n}/${d}`, dec: () => String(+val.toFixed(4)), pct: () => `${+(val * 100).toFixed(2)}%` };
      const from = rng.pick(['frac', 'dec', 'pct', 'pic']), to = rng.pick(['frac', 'dec', 'pct'].filter((x) => x !== from)), others = V.filter(([a, b]) => Math.abs(a / b - val) > 1e-9);
      const as = (x, y, f) => (f === 'frac' ? `${x}/${y}` : f === 'dec' ? String(+(x / y).toFixed(4)) : `${+((x / y) * 100).toFixed(2)}%`);
      const near = [[n, d + 1], [n + 1, d], [d - n, d]].filter(([a, b]) => a > 0 && a < b && Math.abs(a / b - val) > 1e-9);
      return { kind: 'choice', promptHtml: from === 'pic' ? pie(n, d) : `<b class="bigval">${fmt[from]()}</b>`, prompt: `Same value as a ${to === 'frac' ? 'fraction' : to === 'dec' ? 'decimal' : 'percentage'}:`, options: mc(rng, { label: as(n, d, to), value: as(n, d, to) }, [...near, ...rng.sample(others, 3)].map(([a, b]) => ({ label: as(a, b, to), value: as(a, b, to) })), 4), answer: as(n, d, to), cols: 2 };
    } }),
  std({ num: 175, title: 'Mental Checkout', max: 12,
    how: ['Add up the basket in your head (prices are in dollars).', 'Work out the CHANGE from the amount paid.', 'Later: multiples of the same item, a discount, and sales tax.'],
    makeTrial(rng, lv) {
      const I = ['Bread', 'Milk', 'Apples', 'Cheese', 'Coffee', 'Eggs', 'Jam', 'Rice'], k = Math.min(4, 2 + Math.floor(lv / 4)), items = rng.sample(I, k).map((n) => ({ n, c: rng.int(1, 9) * 100 + rng.pick(lv <= 3 ? [0, 50] : [0, 25, 49, 50, 75, 99]), q: lv >= 5 ? rng.int(1, 3) : 1 }));
      let tot = sum(items.map((x) => x.c * x.q)); const disc = lv >= 7 && rng.chance(0.5) ? rng.pick([10, 20, 25]) : 0, tax = lv >= 9 ? 10 : 0;
      if (disc) tot = Math.round(tot * (1 - disc / 100)); if (tax) tot = Math.round(tot * 1.1);
      const pay = [500, 1000, 2000, 5000, 10000].find((p) => p > tot), ch = (pay - tot) / 100;
      return { kind: 'numeric', allowDec: true, prefix: '$', promptHtml: `<span class="receipt">${items.map((x) => `<span><b>${x.q > 1 ? x.q + ' × ' : ''}${x.n}</b><i>$${(x.c / 100).toFixed(2)}</i></span>`).join('')}${disc ? `<span><b>Discount</b><i>−${disc}% off total</i></span>` : ''}${tax ? '<span><b>Tax</b><i>+10% after discount</i></span>' : ''}<span class="paid"><b>Paid with</b><i>$${pay / 100}</i></span></span>`, prompt: 'Change?', answer: ch, tol: 0.005, explain: `Total $${(tot / 100).toFixed(2)}, change $${ch.toFixed(2)}.` };
    } }),
  std({ num: 176, title: 'Ratio Kitchen', max: 12,
    how: ['A recipe serves a certain number of people.', 'Scale it for a different number of guests, keeping every ratio the same.', 'Fractional amounts appear as you improve.'],
    makeTrial(rng, lv) {
      const base = rng.pick([2, 4, 6]), to = lv <= 3 ? base * rng.int(2, 3) : rng.pick([base / 2, base * 1.5, base * 2, base * 3, base * 0.5 * 3].filter((x) => Number.isInteger(x) && x !== base)), R = [['flour', 'cups'], ['sugar', 'cups'], ['butter', 'tbsp'], ['milk', 'cups'], ['eggs', '']];
      const recipe = rng.sample(R, 3).map(([n, u]) => [n, u, u === '' ? rng.int(1, 4) : rng.pick(lv <= 3 ? [1, 2, 3, 4] : [0.5, 1, 1.5, 2, 3, 0.75])]); const q = rng.int(0, 2), ans = (recipe[q][2] * to) / base;
      if (recipe[q][1] === '' && !Number.isInteger(ans)) return this.makeTrial(rng, lv);
      const label = (x) => `${mixed(x)} ${recipe[q][1]}`.trim(), opts = [ans, ans + recipe[q][2] / 2, recipe[q][2] * (to - base) || ans * 2, ans * 1.5, recipe[q][2] + to - base].filter((x) => x > 0);
      return { kind: 'choice', promptHtml: `<span class="recipe"><b>Serves ${base}</b>${recipe.map(([n, u, a]) => `<span>${mixed(a)} ${u} ${n}</span>`).join('')}</span>`, prompt: `How much ${recipe[q][0]} for ${to} people?`, options: mc(rng, { label: label(ans), value: label(ans) }, opts.slice(1).map((x) => ({ label: label(x), value: label(x) })), 4), answer: label(ans), cols: 2 };
    } }),
  std({ num: 177, title: 'Data Detective', max: 12,
    how: ['Read the chart carefully, including its labels.', 'Answer the question from the data.', 'Multi-step questions as you improve.'],
    makeTrial(rng, lv) {
      const cats = rng.sample(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], Math.min(6, 4 + Math.floor(lv / 4))), vals = cats.map(() => rng.int(2, 20) * 5), what = rng.pick(['Bikes rented', 'Books borrowed', 'Pies sold', 'Visitors (×10)']);
      const i = rng.int(0, cats.length - 1), j = rng.pick(range(cats.length).filter((x) => x !== i)), Q = lv <= 3 ? 'max' : lv <= 7 ? rng.pick(['diff', 'max', 'total']) : rng.pick(['diff', 'total', 'avg']);
      const chart = barChart(vals, cats); let prompt, ans, opts;
      if (Q === 'max') { prompt = 'Which day was highest?'; const m = Math.max(...vals); if (vals.filter((v) => v === m).length > 1) return this.makeTrial(rng, lv); ans = cats[vals.indexOf(m)]; opts = cats.map((c) => ({ label: c, value: c })); return { kind: 'choice', promptHtml: `<span class="rule">${what}</span>${chart}`, prompt, options: opts, answer: ans, cols: 3 }; }
      if (Q === 'diff') { prompt = `How many more on ${cats[i]} than ${cats[j]}?`; if (vals[i] <= vals[j]) return this.makeTrial(rng, lv); ans = vals[i] - vals[j]; }
      else if (Q === 'total') { prompt = 'Total across all days?'; ans = sum(vals); }
      else { prompt = 'Average per day? (round to nearest whole)'; ans = Math.round(sum(vals) / vals.length); }
      return { kind: 'numeric', promptHtml: `<span class="rule">${what}</span>${chart}`, prompt, answer: ans };
    } }),
  std({ num: 178, title: 'Probability Marbles', max: 12,
    how: ['A bag holds coloured marbles, shown below. You draw without looking.', 'Pick the exact probability asked for.', 'Two draws, with and without putting the first marble back, come later.'],
    makeTrial(rng, lv) {
      const cs = rng.sample(COLORS.slice(0, 4), 3), cnt = cs.map(() => rng.int(1, 5)), T = sum(cnt), a = rng.int(0, 2), b = rng.int(0, 2), bag = cs.flatMap((c, i) => range(cnt[i]).map(() => `<i style="background:${c[1]}"></i>`)).join('');
      let n, d, prompt;
      if (lv <= 4) { n = cnt[a]; d = T; prompt = `P(${cs[a][0]})?`; }
      else { const back = rng.chance(0.5); prompt = `Draw twice${back ? ', putting the first back' : ', WITHOUT putting it back'}. P(first ${cs[a][0]}, then ${cs[b][0]})?`; n = cnt[a] * (back ? cnt[b] : cnt[b] - (a === b ? 1 : 0)); d = T * (back ? T : T - 1); if (n <= 0) return this.makeTrial(rng, lv); }
      const ans = frac(n, d), ds = [frac(n + 1, d), frac(Math.max(1, n - 1), d), frac(n, d + 1), frac(cnt[a], T), frac(cnt[a] + cnt[b], 2 * T), frac(n, T * T)];
      return { kind: 'choice', promptHtml: `<span class="bag">${bag}</span>`, prompt, options: mc(rng, { label: ans, value: ans }, ds.filter((x) => x !== ans).map((x) => ({ label: x, value: x })), 4), answer: ans, cols: 2 };
    } }),
  std({ num: 179, title: 'Unit Switch', max: 12,
    how: ['Convert the quantity into the unit asked for.', 'Check the units: bigger unit means a smaller number.', 'Two-step conversions as you improve.'],
    makeTrial(rng, lv) {
      const U = [['km', 'm', 1000], ['m', 'cm', 100], ['kg', 'g', 1000], ['L', 'mL', 1000], ['h', 'min', 60], ['min', 's', 60], ['ft', 'in', 12], ['yd', 'ft', 3], ['day', 'h', 24]], two = [['km', 'cm', 100000], ['h', 's', 3600], ['yd', 'in', 36], ['day', 'min', 1440]];
      const [A, B, f] = rng.pick(lv >= 7 ? [...U, ...two] : U), down = rng.chance(0.6); let v, ans;
      if (down) { v = rng.int(2, 9 + lv); ans = v * f; } else { ans = rng.int(2, 9 + lv); v = ans * f; }
      return { kind: 'numeric', prompt: down ? `${v} ${A} = ? ${B}` : `${v} ${B} = ? ${A}`, answer: ans };
    } }),
  std({ num: 180, title: 'Patterned Arithmetic', max: 12,
    how: ['Clever rewrites make mental maths easier.', 'Pick the rewrite that has EXACTLY the same value as the original.', 'The traps get more convincing as you improve.'],
    makeTrial(rng, lv) {
      const fam = rng.pick(lv <= 3 ? ['comp', 'split'] : ['comp', 'split', 'dist', 'compl']); let orig, good, bad;
      if (fam === 'comp') { const a = rng.int(2, 9) * 100 - rng.int(1, 3), b = rng.int(21, 89), d = Math.ceil(a / 100) * 100 - a; orig = `${a} + ${b}`; good = `${a + d} + ${b - d}`; bad = [`${a + d} + ${b + d}`, `${a + d} + ${b}`, `${a - d} + ${b + d + 1}`]; }
      else if (fam === 'split') { const a = rng.pick([25, 50, 125]), m = rng.pick([4, 8, 2]), b = m * rng.int(3, 9); orig = `${a} × ${b}`; good = `${a} × ${m} × ${b / m}`; bad = [`${a} × ${m} + ${b / m}`, `${a} × ${b - m}`, `${a + m} × ${b / m}`]; }
      else if (fam === 'dist') { const a = rng.int(3, 9), b = rng.pick([99, 98, 101, 49, 51]), r = Math.round(b / 50) * 50, d = b - r; orig = `${a} × ${b}`; good = d < 0 ? `${a} × ${r} − ${a * -d}` : `${a} × ${r} + ${a * d}`; bad = [d < 0 ? `${a} × ${r} − ${-d}` : `${a} × ${r} + ${d}`, `${a} × ${r}`, d < 0 ? `${a} × ${r} + ${a * -d}` : `${a} × ${r} − ${a * d}`]; }
      else { const b = rng.int(101, 899); orig = `1000 − ${b}`; good = `999 − ${b} + 1`; bad = [`999 − ${b}`, `1000 − ${b + 1} − 1`, `${1000 - b + 10}`]; }
      const ev = (s) => Function(`return (${s.replace(/×/g, '*').replace(/−/g, '-')})`)(), ov = ev(orig), opts = [good, ...bad].filter((x, i) => i === 0 || Math.abs(ev(x) - ov) > 1e-9);
      return { kind: 'choice', promptHtml: `<b class="bigval">${orig}</b>`, prompt: 'Same value as…', options: rng.shuffle(opts).map((x) => ({ label: x, value: x })), answer: good, cols: 1, explain: `${orig} = ${ov} = ${good}.` };
    },
    verify(t) { const ev = (s) => Function(`return (${s.replace(/×/g, '*').replace(/−/g, '-')})`)(), o = ev(t.promptHtml.replace(/<[^>]+>/g, '')); if (t.options.filter((x) => Math.abs(ev(x.value) - o) < 1e-9).length !== 1) throw new Error('patterned arithmetic: not exactly one equivalent'); } }),
];
