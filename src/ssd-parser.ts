
export interface SsdMetadata {
    name: string;
    type?: string;
    bpv?: string;
    reference?: string;
    book?: string;
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
        /MOVEMENT\s+COST/i,
        /\s+#\s+/i,
        /\s+\*\s+/i,
        /\s+\d\s+/i,
        /BRIDGE/i,
        /CNTR/i,
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

    /** Used to correct names commonly misread by OCR. */
    protected static MISREAD_RACE_NAMES: { [correctName: string]: (string | RegExp)[]} = {
        'THOLIAN': ['THOLIFIN', 'THOLIRN', /THOL\s+IAN/, /THOLI\s+AN/, 'TIHOLIRN', 'THOILIRN'],
        'HYDRAN': ['HYDRFIN', 'HYDRRN', 'HYORRN'],
        'ROMULAN': ['ROMULRN', 'ROMULFIN', 'ROMIARN', 'ROMUILAN', 'REIMULFIN'],
        'ANDROMEDAN': ['RNDROMEDRN', 'RNOROMEORN', 'ANDROMEOFIN', 'ANDROMEDFIN', 'ANDROMERN', 'FINDROMEDFIN', 'RNBROMEORN', 'FINDROMEDAN', 'FINDROMEOFIN', 'ANDROMEIORN'],
        'LYRAN': ['LYRRN', 'LYRFIN', 'LYFIFIN', 'LYRF1N', 'LYMAN'],
        'FEDERATION': ['FEDERFITION', 'FEDERRTION', 'FEDEFIRTION'],
        'KLINGON': ['KILINGON'],
        'GORN': ['GOAN'],
        'KZINTI': ['KZINT1'],
    };

    /**
     * Used for further corrections, only when MISREAD_RACE_NAMES alone did not yeild results.
     *
     * These corrections, applied too soon, could cause true values to be overlooked, so it should only be applied when
     * absolutely necessary.
     */
    protected static REALLY_MISREAD_RACE_NAMES: { [correctName: string]: (string | RegExp)[]} = {
        'HYDRAN': ['11-1YDRAN', 'HYMAN', 'I-IYDRRN', 'HIYEIFIRN', '1-1YDRAN'],
        'KLINGON': [/KL\s+I\s+NGON/],
        'THOLIAN': [/THOL\s+I\s+AN/],
        'ISC': [/I\s+SC/, '(SC', '1SC', '!SC', 'ISIC'],
        'GORN': ['BORN'],
    };

    protected rawText: string;

    constructor(text: string) {
        this.rawText = text;
    }

    /** Corrects race names that are commonly read incorrectly by OCR. */
    correctMisspelledRaces(text: string, desperate: boolean = false): string {
        const corrections = desperate ? SsdParser.REALLY_MISREAD_RACE_NAMES : SsdParser.MISREAD_RACE_NAMES;
        let output = text;
        for (const correctVersion of Object.keys(corrections)) {
            for (const incorrectVersion of corrections[correctVersion]) {
                output = output.replace(incorrectVersion, correctVersion);
                if (typeof incorrectVersion === 'string') {
                    output = output.replace((incorrectVersion as string).toLowerCase(), correctVersion.toLowerCase());
                    output = output.replace(this.toTitleCase(incorrectVersion as string), this.toTitleCase(correctVersion));
                }
            }
        }
        return output;
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

    findShipName(desperattionLevel: number = 0): string {
        const raceRegex = new RegExp(`(${SsdParser.RACE_NAMES.join('|')}|${SsdParser.RACE_NAMES.map(v => v === 'ISC' ? 'ISC' : this.toTitleCase(v)).join('|')})`, 'g');
        const correctedRawText = this.correctMisspelledRaces(this.rawText, !!desperattionLevel);
        const result = raceRegex.exec(correctedRawText);
        /*-* / if (desperattionLevel) console.log("result=", result); /*+*/
        if (result) {
            const searchText = correctedRawText.substring(result.index);
            const stopIndex = this.findStopWordIndex(searchText);
            const rawName = searchText.substring(0, stopIndex);
            /*-* /if (desperattionLevel) console.log("rawName=", rawName); /*+*/
            const allUpperName = rawName.replace(/\s{2}/g, ' ').trim();
            const titleCaseName = this.toTitleCase(allUpperName);
            if (titleCaseName.length <= 60) {
                return titleCaseName;
            } else {
                throw new Error(`Name '${titleCaseName}' is too long.`);
            }
        }
        throw new Error(`\n*****\nNo name found within text:\n${correctedRawText}\n*****`);
        //throw new Error(`No name found.`);
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
        let shipName: string;
        try {
            shipName = this.findShipName();
        } catch (err1) {
            try {
                shipName = this.findShipName(1);
            } catch (err2) {
                err1.metadata = {
                    type: this.findShipType(),
                    bpv: this.findBpv(),
                    reference: this.findReference(),
                };
                throw err1;
            }
        }

        return {
            name: shipName,
            type: this.findShipType(),
            bpv: this.findBpv(),
            reference: this.findReference(),
        }
    }

    toTitleCase(text: string): string {
        return text.toLowerCase().split(' ').map(word => {
            if (word.match(/(\w{1,3}\-\w{1,3}|\w+\d+\w+)/)) return word.toUpperCase();
            if (word.toUpperCase() === 'ISC') return 'ISC';
            if (word.toUpperCase() === 'PF') return 'PF';
            return word ? word.replace(word[0], word[0].toUpperCase()) : word;
        }).join(' ');
    }
}