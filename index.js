import classes from './data/classes.js';
import races from './data/races.js';
import backgrounds from './data/backgrounds.js';

const config = {
    statgen: 'Standard array',
    permittedsources: [],
    allsources: []
}

// variety of ways to generate 6 random stats
const statgen = {
    "All tens": () => [10, 10, 10, 10, 10, 10],
    "Standard array": () => {
        let sa = [15, 14, 13, 12, 10, 8];
        let response = [];

        while (sa.length > 0) {
            response.push(...sa.splice(dieroll(sa.length, 0), 1))
        }
        return response;
    },
    "Random 3-18": () => {
        const one = () => dieroll(18, 3)
        return [one(), one(), one(), one(), one(), one()];
    },
    "3d6": () => {
        const one = () => dieroll(6) + dieroll(6) + dieroll(6);
        return [one(), one(), one(), one(), one(), one()];
    },
    "4d6, drop lowest": () => {
        const one = () => [dieroll(6), dieroll(6), dieroll(6), dieroll(6)].sort().slice(1).reduce((a, b) => a + b);
        return [one(), one(), one(), one(), one(), one()];
    }
}

// default option
const na = {
    name: 'n/a',
    source: null
}

// roll a single die with <high> sides. Also works as a generic randomizer if a <low> is provided
function dieroll(high, low) {
    if (low == null) { low = 1 }
    return Math.floor((Math.random() * (high - low)) + low);
}

// take the racial stat modifiers (con+1, etc) and adds them to the existing stats
function processstatmods(stats, modstring) {
    if (modstring.endsWith(',')) {
        modstring = modstring.slice(0, modstring.length - 1)
    }
    if (modstring.startsWith(',')) {
        modstring = modstring.slice(1, modstring.length)
    }

    let mods = modstring.toLocaleLowerCase().split(',');
    const allstats = ['str', 'dex', 'con', 'int', 'wis', 'cha'];

    for (let mod of mods) {
        let adding = mod.split('+');
        if (adding.length !== 1) {
            if (adding[0] === '%') {
                adding[0] = allstats[dieroll(allstats.length, 0)]
            }
            stats[adding[0]] += +adding[1]
            allstats.splice(allstats.indexOf(adding[0]), 1)

            continue;
        }

        let subtracting = mod.split('-');
        if (subtracting.length !== 1) {
            if (subtracting[0] === '%') {
                subtracting[0] = allstats[dieroll(allstats.length, 0)]
            }
            stats[subtracting[0]] -= +subtracting[1]
            allstats.splice(allstats.indexOf(subtracting[0]), 1)

            continue;
        }
        throw new Error('messed up stat mod, check your data', modstring)
    }
}

// calculates stat modifiers and returns them in a print-friendly format, ie: +2 for 15, -1 for 9
function statmod(stat) {
    let mod = Math.floor((stat - 10) / 2);
    return (mod >= 0 ? '+' : '') + mod;
}

// gathers up all the bits to build a character into one place
function assemble() {
    let character = {
        class: null,
        subclass: null,
        race: null,
        subrace: null,
        background: null,
        stats: {}
    };
    let permittedclasses = classes.filter(z => config.permittedsources.indexOf(z.source) !== -1)
    let permittedraces = races.filter(z => config.permittedsources.indexOf(z.source) !== -1)
    let permittedbackgrounds = backgrounds.filter(z => config.permittedsources.indexOf(z.source) !== -1)

    let availableclasses = permittedclasses.filter(z => z.base == null);
    character.class = availableclasses[dieroll(availableclasses.length, 0)];

    let availablesubclasses = permittedclasses.filter(z => z.base === character.class.name);
    character.subclass = availablesubclasses[dieroll(availablesubclasses.length, 0)] || na;

    let availableraces = permittedraces.filter(z => z.base == null);
    character.race = availableraces[dieroll(availableraces.length, 0)];

    let availablesubraces = permittedraces.filter(z => z.base == character.race.name);
    character.subrace = availablesubraces[dieroll(availablesubraces.length, 0)] || na;

    character.background = permittedbackgrounds[dieroll(permittedbackgrounds.length, 0)]

    let [str, dex, con, int, wis, cha] = statgen[config.statgen]();
    character.stats.str = str;
    character.stats.dex = dex;
    character.stats.con = con;
    character.stats.int = int;
    character.stats.wis = wis;
    character.stats.cha = cha;

    processstatmods(character.stats, [character.race.statmods, character.subrace.statmods].join(','))

    return character;
}

// handler for when a sourcebook checkbox is clicked
function togglepermittedsource(source) {
    let ind = config.permittedsources.indexOf(source)
    if (ind === -1) {
        config.permittedsources.push(source);
    } else {
        config.permittedsources.splice(ind, 1)
    }
}

// harvest the list of available source books and add them to the config object
for (let item of classes.concat(races).concat(backgrounds)) {
    if (config.allsources.indexOf(item.source) === -1) {
        config.allsources.push(item.source)
        config.permittedsources.push(item.source)
    }
}
config.allsources.sort()
config.permittedsources.sort()

// create the list of check boxes for each source book
let bookselectors = document.getElementById('booklist');
for (let s of config.allsources) {
    let eid = `${s} toggle`

    let checkbox = document.createElement('input')
    checkbox.type = 'checkbox';
    checkbox.id = eid;
    checkbox.onchange = () => { togglepermittedsource(s) }
    checkbox.checked = true;

    let label = document.createElement('label');
    label.htmlFor = eid;
    label.className = 'booktoggle';
    label.innerText = s;

    label.prepend(checkbox);
    bookselectors.appendChild(label);
}

// populate the dropdown with available stat generation methods
for (let s of Object.keys(statgen)) {
    let e = document.createElement('option');
    e.value = s;
    e.text = s;
    e.selected = s === config.statgen;

    document.getElementById('statgenpicker').appendChild(e);
}

// event handler for the statgen dropdown selection changing
document.getElementById('statgenpicker').addEventListener('change', event => {
    for (let i = 0; i < event.target.children.length; i++) {
        const opt = event.target.children[i];

        if (opt.selected === true) {
            config.statgen = opt.value;
            break
        }
    }
}, false);

// event handler for the assemble button
document.getElementById('assembler').addEventListener('click', () => {
    let c = assemble();
    let sources = [];
    for (let s of [c.race.source, c.subrace.source, c.class.source, c.subclass.source, c.background.source]) {
        if (s && sources.indexOf(s) === -1) {
            sources.push(s);
        }
    }
    sources.sort()
    let statstring = 'Stats:<br/>';
    for (let s of ['Str', 'Dex', 'Con', 'Int', 'Wis', 'Cha']) {
        statstring += `${s}: ${c.stats[s.toLocaleLowerCase()]} (${statmod(c.stats[s.toLocaleLowerCase()])})<br/>`
    }

    let outputsection = document.getElementById('output');

    outputsection.children.race.innerHTML = `Race: ${c.race.name} (${c.subrace.name})`
    outputsection.children.class.innerHTML = `Class: ${c.class.name} (${c.subclass.name})`
    outputsection.children.background.innerHTML = `Background: ${c.background.name}`
    outputsection.children.stats.innerHTML = statstring;
    outputsection.children.sources.innerHTML = `Sources:<br/>${sources.join('<br/>')}`

}, false)