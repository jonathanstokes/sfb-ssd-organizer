import * as fs from 'fs';
import {SsdMetadata, SsdParser} from "./ssd-parser";
import {GoogleDriveWalker} from "./google-drive-walker";
//import * as PdfParse from 'pdf-parse';

const pdfParse = require('pdf-parse');

export enum MetadataProperties {
    TYPE = 'type',
    BPV = 'bpv',
    REFERENCE = 'reference',
    BOOK = 'book',
}

export const MetadataTitles: {[key: string]: string} = {
    'type': 'Type',
    'bpv': 'BPV',
    'reference': 'Ref',
    'book': 'Book'
};

export class Processor {

    async processFilesWithoutDescriptions() {
        const walker = new GoogleDriveWalker();
        const files = await walker.listFilesWithoutDescriptions();

        for (const file of files) {
            //const file = await walker.getFileDetails(fileId);
            //const fileMetadata = await walker.getFileDetails('1Vix9emdLZeLScykxGlkhf30WVLMhVljW');
            //console.log('fileMetadata=', JSON.stringify(fileMetadata, null, 2));
            //return;

            /*-* /
            file.id = '1WVVHub8B7zMwQnJ4JPXUgELeRDjahpDD';
            file.name = 'test_file.pdf';
            /*+*/

            //console.log('downloading...');
            const downloadedFilename = await walker.downloadFile(file.id);
            try {
                //console.log('downloaded ', downloadedFilename);

                const pdfData = await pdfParse(downloadedFilename);

                let ssdMetadata: SsdMetadata;
                try {
                    ssdMetadata = new SsdParser(pdfData.text).parseMetadata();
                    console.log(`${file.name} (${file.id}): ${JSON.stringify(ssdMetadata)}`);
                } catch (err) {
                    console.error(`Could not parse metadata for ${file.name}: ${err}`);
                    if (err.metadata) {
                        const partialDescription = this.getDescription({name: '', ...err.metadata}, file.name);
                        console.log(`Partial description for ${this.getViewLink(file.id)}\n:\n${partialDescription}`);
                    }
                    break;
                }

                if (ssdMetadata) {
                    const description = this.getDescription(ssdMetadata, file.name);
                    /*-* / break; /*+*/
                    await walker.updateMetadata(file.id, {
                        description,
                        // properties: {
                        //     shipName: ssdMetadata.name,
                        // }
                    });
                }
            } finally {
                fs.unlinkSync(downloadedFilename);
            }
        }
    }

    async updateAllDescriptions(downloadPdfs = true) {
        const walker = new GoogleDriveWalker();
        const files = await walker.listFilesAndDescriptions();

        /*-*/
        const startIndex = 0;
        let currentIndex = 0;
        /*+*/
        for (const file of files) {
            /*-*/
            if (currentIndex < startIndex) {
                currentIndex++;
                if (currentIndex % 50 === 0) console.log(`[${currentIndex}]`);
                continue;
            }
            /*+*/
            let ssdMetadata: SsdMetadata;
            if (downloadPdfs) {
                const downloadedFilename = await walker.downloadFile(file.id, file.name);
                try {
                    const pdfData = await pdfParse(downloadedFilename);
                    try {
                        ssdMetadata = new SsdParser(pdfData.text).parseMetadata();
                        //console.log(`${file.name} (${file.id}): ${JSON.stringify(ssdMetadata)}`);
                    } catch (err) {
                        // Sometimes the text is blank, as if OCR didn't work at all.
                        // Also, if the manual description says "(General)", then our parsing methods don't work.
                        // Also, if the title is too long, we don't need to note that.
                        if (pdfData.text.trim().length && (!file.description || file.description.indexOf('(General)') < 0) && (!err.message || err.message.indexOf('is too long') >= 0)) {
                            console.error(`[${currentIndex}] Could not parse metadata for ${file.name}: ${err}`);
                        }
                        ssdMetadata = {name: ''};
                    }
                } finally {
                    fs.unlinkSync(downloadedFilename);
                }
            }
            else {
                ssdMetadata = {name: ''};
            }

            if (file.description) {
                ssdMetadata.book = this.getBookFromFileName(file.name);
                const existingDescriptionData = this.parseDescription(file.description);
                const updatedDescription = this.updateDescription(file.description, existingDescriptionData, ssdMetadata);
                if (updatedDescription) {
                    /*-*/
                    console.log(`==== [${currentIndex}] Updating description in ${file.name} from: ====\n${file.description}\n==== to ====\n${updatedDescription}\n============`);
                    //continue;
                    /*+*/
                    await walker.updateMetadata(file.id, {
                        description: updatedDescription,
                    });
                }
            }

            /*-*/ currentIndex++; /*+*/
        }
    }

    async identifyMultipleDescriptions() {
        const walker = new GoogleDriveWalker();
        const files = await walker.listFilesAndDescriptions();

        for (const file of files) {
            if (file.description && this.hasMultipleDescriptions(file.description)) {
                console.log(`Multiple info in: ${this.getViewLink(file.id)}`);
            }
        }
    }

    async findMetadata() {
        try {
            const directoryName = '/Users/stokes/gdrive/home/games/war_games/Star\ Fleet\ Battles/SSDs/Federation/';
            const files = fs.readdirSync(directoryName);
            //const file = fs.readFileSync('/Users/stokes/gdrive/home/games/war_games/Star\ Fleet\ Battles/SSDs/ssd_book_9_007.pdf');
            for (const fileName of files) {
                const fullyQualifiedFileName = directoryName + fileName;
                if (fs.statSync(fullyQualifiedFileName).isFile() && fullyQualifiedFileName.endsWith('.pdf') && fileName.indexOf('_') >= 0) {
                    //console.log(`Processing ${fileName}.`);
                    const data = await pdfParse(fullyQualifiedFileName);
                    // console.log("data=", data);
                    try {
                        const metadata = new SsdParser(data.text).parseMetadata();
                        console.log(`Metadata for ${fileName}: ${JSON.stringify(metadata)}`);
                    } catch (parseErr) {
                        console.error(`Error parsing ${fileName}: `, parseErr.message ? parseErr.message : parseErr);
                    }
                }
            }
        } catch (err) {
            console.error(err);
        }
    }

    protected getDescription(ssdMetadata: SsdMetadata, fileName: string) {
        let description = ssdMetadata.name;
        if (ssdMetadata.type) description += `\nType: ${ssdMetadata.type}`;
        if (ssdMetadata.bpv) description += `\nBPV: ${ssdMetadata.bpv}`;
        if (ssdMetadata.reference) description += `\nRef: ${ssdMetadata.reference}`;
        const book = this.getBookFromFileName(fileName);
        if (book) description += `\nBook: ${book}`;
        return description;
    }

    protected getBookFromFileName(fileName: string): string | undefined {
        let matches = /ssd_book_(\d+)_/.exec(fileName);
        if (matches) return `Commander's SSD Book #${matches[1]}`;
        matches = /module_(\w+)_ssd_book/.exec(fileName);
        if (matches) return `Captain's Module ${matches[1].toUpperCase()} SSD Book`;
        matches = /captains_basic_set_ssd_book/.exec(fileName);
        if (matches) return `Captain's Basic Set SSD Book`;
        matches = /captains_advanced_missions_ssd_book/.exec(fileName);
        if (matches) return `Captain's Advanced Missions SSD Book`;
        matches = /captains_module_(\w+)_ssd_book/.exec(fileName);
        if (matches) return `Captain's Module ${matches[1].toUpperCase()} SSD Book`;
        matches = /supplement_3_fast_patrol_ships/.exec(fileName);
        if (matches) return `Supplement #3 Fast Patrol Ships`;
        matches = /ssd_sheets_commanders_volume_(\w+)_/.exec(fileName);
        if (matches) return `SSD Sheets, Commander's Edition, Volume ${matches[1]}`;
        return undefined;
    }

    protected getViewLink(fileId: string): string {
        return `https://drive.google.com/file/d/${fileId}/view`;
    }

    protected hasMultipleDescriptions(description: string): boolean {
        for (const regex of [/^Type:\s*(.*)$/gm, /^BPV:\s*(.*)$/gm, /^Ref:\s*(.*)$/gm, /^Book:\s*(.*)$/gm]) {
            if (regex.exec(description) && regex.exec(description)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Parses a text description into metadata fields.
     */
    protected parseDescription(description: string): SsdMetadata {
        const nameEnd = description.search(/^(Type|BPV|Ref|Book):/gm);
        const name = description.substring(0, nameEnd).trim();
        const typeMatches = /^Type:\s*(.*)$/gm.exec(description);
        const type = typeMatches && typeMatches[1] || undefined;
        const bpvMatches = /^BPV:\s*(.*)$/gm.exec(description);
        const bpv = bpvMatches && bpvMatches[1] || undefined;
        const refMatches = /^Ref:\s*(.*)$/gm.exec(description);
        const reference = refMatches && refMatches[1] || undefined;
        const scanMatches = /^Scan:\s*(.*)$/gm.exec(description);
        const scan = refMatches && refMatches[1] || undefined;
        const bookMatches = /^Book:\s*(.*)$/gm.exec(description);
        const book = bookMatches && bookMatches[1] || undefined;
        return {
            name, type, bpv, reference, scan, book
        };
    }

    protected applyUpdates(description: string, updates: any): string {
        let output = description;
        const insertionPoint: {[key: string]: RegExp | null} = {
            type: /^(BPV|Ref|Book):\s*.*$/gm,
            bpv: /^(Ref|Book):\s*.*$/gm,
            reference: /^(Book):\s*.*$/gm,
            book: null,
        };
        // As a special-case, a given .book value replaces the existing value, so we can remove any existing value in that case.
        if (updates.book) {
            const bookRegex = /^Book:\s*.*$\n*/gm;
            const existingBooks = output.match(bookRegex);
            if (existingBooks) {
                if (existingBooks.length > 1) throw new Error(`Cannot update "Book:" field when description contains more than one book:\n${description}`);
                output = output.replace(bookRegex, '');
            }
        }
        for (const key of Object.values(MetadataProperties)) {
            if (updates[key]) {
                const regex = insertionPoint[key];
                if (regex !== null) {
                    const index = output.search(regex);
                    if (index > 0) {
                        output = `${output.substring(0, index)}${MetadataTitles[key]}: ${updates[key]}\n${output.substring(index)}`;
                    }
                    else throw new Error(`Could not find insertion point for ${key} in:\n${description}`);
                } else {
                    // just append to the end.
                    if (!output.endsWith('\n')) output += '\n';
                    output = `${output}${MetadataTitles[key]}: ${updates[key]}\n`;
                }
            }
        }
        return output;
    }

    /** Returns an updated description, if needed, or `null` if no update is needed. */
    protected updateDescription(description: string, existingDescriptionData: SsdMetadata, ssdMetadata: any): string | null {
        const updates: any = {};
        for (const key of Object.keys(MetadataProperties)) {
            if (!(existingDescriptionData as any)[key] && ssdMetadata[key]) updates[key] = ssdMetadata[key];
        }
        if (existingDescriptionData.book && ssdMetadata.book && existingDescriptionData.book !== ssdMetadata.book) updates.book = ssdMetadata.book;
        return Object.keys(updates).length ? this.applyUpdates(description, updates) : null;
    }
}
