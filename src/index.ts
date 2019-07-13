// tslint:disable-next-line:no-var-requires

import * as fs from 'fs';
import {SsdMetadata, SsdParser} from "./ssd-parser";
import {GoogleDriveWalker} from "./google-drive-walker";
//import * as PdfParse from 'pdf-parse';

const pdfParse = require('pdf-parse');

class Parser {

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

                let ssdMetadata;
                try {
                    ssdMetadata = new SsdParser(pdfData.text).parseMetadata();
                    console.log(`${file.name} (${file.id}): ${JSON.stringify(ssdMetadata)}`);
                } catch (err) {
                    console.error(`Could not parse metadata for ${file.name}: ${err}`);
                    if (err.metadata) {
                        const partialDescription = this.getDescription({name: '', ...err.metadata}, file.name);
                        console.log(`Partial description for https://drive.google.com/file/d/${file.id}/view:\n${partialDescription}\n`);
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
        if (matches) return `Captain's Module ${matches[1].toUpperCase()} - SSD Book`;
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
}

try {
    new Parser().processFilesWithoutDescriptions();
} catch (err) {
    console.error(err);
}
