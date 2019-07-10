
export interface SsdMetadata {
    name: string;
    type?: string;
    bpv?: string;
    reference?: string;
}

export class SsdParser {

    protected static BPV_PATTERN = /POINT\s+VALUE\s*=\s*([\S]+)/g;

    protected static SHIP_TYPE_PATTERN = /TYPE\s*=\s*([\S]+)/g;

    protected static REFERENCE_PATTERN = /REFERENCE\s*=\s*([\S]+)/g;

    protected static STOP_WORDS: RegExp[] = [
        /SHIELD\s+(\d{1,2}|#\d)/i,
        /BOARDING\s+PARTIES/i,
        /PROBES/i,
        /ADMINISTRATIVE\s+SHUTTLES/i,
        /SHIELD/i,
        /TRAC/i,
        /BTTY/i,
        /TRAN/i,
        /PH\s*-\s*(1|I)/i,
        /PH\s*-\s*(2|II)/i,
        /PH\s*-\s*(3|III)/i,
        /LAB/i,
        /HULL/i,
        /SENSOR/i,
        /SCANNER/i,
        /CREW\s+UNITS/i,
        /HELLBORE/i,
        /DATA\s+TABLE/i,
        /FIGHTER\s+GROUP/i,
        /IMPULSE/i,
        /DAMAGE\s+CONTROL/i,
        /APR/i,
        /DRONE\s+RACK/i,
        /#\d/i,
        /PHASER/i,
        /TURN\s+MODE/i,
        /ANTI\s*-\s*DRONE/i,
        /AMARILLO\s+DESIGN\s+BUREAU/i,
        /WARP/i,
        /Copyright\s+\d{4}/i,
        /CREW/i,
    ];

    protected static RACE_NAMES = [
        'FEDERATION',
        'GORN',
        'KZINTI',
        'THOLIAN',
        'LYRAN',
        'HYDRAN',
        'ROMULAN',
        'KLINGON',
        'WYN',
        'ORION',
        'ISC',
        'ANDROMEDAN',
    ];

    protected rawText: string;

    constructor(text: string) {
        this.rawText = text;
    }

    findBpv(): string | undefined {
        const result = SsdParser.BPV_PATTERN.exec(this.rawText);
        if (result) {
            return result[1];
        }
        return undefined;
    }

    findReference(): string | undefined {
        const result = SsdParser.REFERENCE_PATTERN.exec(this.rawText);
        if (result) {
            return result[1];
        }
        return undefined;
    }

    findShipType(): string | undefined {
        const result = SsdParser.SHIP_TYPE_PATTERN.exec(this.rawText);
        if (result) {
            return result[1];
        }
        return undefined;
    }

    findShipName(): string {
        const raceRegex = new RegExp(`(${SsdParser.RACE_NAMES.join('|')}|${SsdParser.RACE_NAMES.map(v => v === 'ISC' ? 'ISC' : this.toTitleCase(v)).join('|')})`, 'g');
        const result = raceRegex.exec(this.rawText);
        if (result) {
            const searchText = this.rawText.substring(result.index);
            const stopIndex = this.findStopWordIndex(searchText);
            const rawName = searchText.substring(0, stopIndex);
            const allUpperName = rawName.replace(/\s{2}/g, ' ').trim();
            const titleCaseName = this.toTitleCase(allUpperName);
            if (titleCaseName.length <= 50) {
                return titleCaseName;
            } else {
                throw new Error(`Name '${titleCaseName}' is too long.`);
            }
        }
        //throw new Error(`\n*****\nNo name found within text:\n${this.rawText}\n*****`);
        throw new Error(`No name found.`);
    }

    findStopWordIndex(text: string): number {
        let index = text.length;
        for (const regex of SsdParser.STOP_WORDS) {
            const result = regex.exec(text);
            if (result) {
                index = result.index < index ? result.index : index;
            }
        }
        return index;
    }

    parseMetadata(): SsdMetadata {
        return {
            name: this.findShipName(),
            type: this.findShipType(),
            bpv: this.findBpv(),
            reference: this.findReference(),
        }
    }

    toTitleCase(text: string): string {
        return text.toLowerCase().split(' ').map(word => {
            if (word.match(/\w{1,3}\-\w{1,3}/)) return word.toUpperCase();
            if (word === 'ISC') return 'ISC';
            return word ? word.replace(word[0], word[0].toUpperCase()) : word;
        }).join(' ');
    }
}