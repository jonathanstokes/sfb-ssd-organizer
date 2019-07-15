import {Processor} from "./processor";


try {
    new Processor().identifyMultipleDescriptions().catch(err => console.error(err));
    //new Processor().processAllFiles().catch(err => console.error(err));
} catch (err) {
    console.error(err);
}
