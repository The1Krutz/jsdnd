import classes from './data/classes.js';
import races from './data/races.js';
import backgrounds from './data/backgrounds.js';

const config = {
    statgen: 'standardarray',
    permittedsources: [],
    allsources: []
}

// variety of ways to generate 6 random stats
const statgen = {
    alltens: () => [10, 10, 10, 10, 10, 10],
    standardarray: () => {
        let sa = [15, 14, 13, 12, 10, 8];
        let response = [];

        while (sa.length > 0) {
            response.push(...sa.splice(dieroll(sa.length, 0), 1))
        }
        return response;
    },
    _3to18: () => [
        dieroll(18, 3),
        dieroll(18, 3),
        dieroll(18, 3),
        dieroll(18, 3),
        dieroll(18, 3),
        dieroll(18, 3)
    ],
    _3d6: () => [
        dieroll(6) + dieroll(6) + dieroll(6),
        dieroll(6) + dieroll(6) + dieroll(6),
        dieroll(6) + dieroll(6) + dieroll(6),
        dieroll(6) + dieroll(6) + dieroll(6),
        dieroll(6) + dieroll(6) + dieroll(6),
        dieroll(6) + dieroll(6) + dieroll(6),
    ],
    _4d6droplowest: () => {
        // todo
    }
}

const na = {
    name: 'n/a',
    source: null
}

function dieroll(high, low) {
    if (low == null) { low = 1 }
    return Math.floor((Math.random() * (high - low)) + low);
}

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

function statmod(stat) {
    let mod = Math.floor((stat - 10) / 2);
    return (mod >= 0 ? '+' : '') + mod;
}

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

function togglepermittedsource(source) {
    let ind = config.permittedsources.indexOf(source)
    if (ind === -1) {
        config.permittedsources.push(source);
    } else {
        config.permittedsources.splice(ind, 1)
    }

    console.log(config.permittedsources.sort())
}

for (let item of classes.concat(races).concat(backgrounds)) {
    if (config.allsources.indexOf(item.source) === -1) {
        config.allsources.push(item.source)
        config.permittedsources.push(item.source)
    }
}
config.allsources.sort()
config.permittedsources.sort()

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