import {Processor} from "./processor";


try {
    new Processor().updateAllDescriptions(false).catch(err => console.error(err));
} catch (err) {
    console.error(err);
}
