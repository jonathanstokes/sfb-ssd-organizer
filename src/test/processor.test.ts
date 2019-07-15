import {Processor} from "../processor";
import {SsdMetadata} from "../ssd-parser";

class TestProcessor extends Processor {

    applyUpdates(description: string, updates: any): string {
        return super.applyUpdates(description, updates);
    }

    hasMultipleDescriptions(description: string): boolean {
        return super.hasMultipleDescriptions(description);
    }

    parseDescription(description: string): SsdMetadata {
        return super.parseDescription(description);
    }
}

const processor = new TestProcessor();

test('parseDescription()', async () => {
    const metadata = processor.parseDescription('(General)\n' +
        'Large Disruptor-Armed Freighter\n' +
        'Type: F-AL\n' +
        'BPV: 75\n' +
        'Ref: R1.21\n' +
        'Book: Captain\'s Advanced Missions SSD Book');
    expect(metadata).toEqual({
        name: '(General)\nLarge Disruptor-Armed Freighter',
        type: 'F-AL',
        bpv: '75',
        reference: 'R1.21',
        book: 'Captain\'s Advanced Missions SSD Book'
    });
});

test('hasMultiple()', async () => {
    expect(processor.hasMultipleDescriptions(
        '(General)\n' +
        'Planetary Defense System\n' +
        '\n' +
        'Defense Satellites (Plasma-D)\n' +
        'Type: DEFSAT\n' +
        'BPV: 27\n' +
        'Ref: R1.15\n' +
        'Book: Commander\'s SSD Book #9\n' +
        '\n' +
        'Ground Bases\n' +
        '\n' +
        'PF Ground Base\n' +
        'BPV: 15\n' +
        'Ref: R1.28J\n' +
        'Book: Commander\'s SSD Book #9\n' +
        '\n' +
        'Planetary Control Base\n' +
        'BPV: 30\n' +
        'Ref: R1.28K\n' +
        'Book: Commander\'s SSD Book #9\n' +
        '\n' +
        'Federation Planetary Control Base\n' +
        'BPV: 30\n' +
        'Ref: R1.28K\n' +
        'Book: Commander\'s SSD Book #9\n')
    ).toBeTruthy();
    expect(processor.hasMultipleDescriptions(
        '(General)\n' +
        'Large Disruptor-Armed Freighter\n' +
        'Type: F-AL\n' +
        'BPV: 75\n' +
        'Ref: R1.21\n' +
        'Book: Captain\'s Advanced Missions SSD Book')
    ).toBeFalsy();
});

test('applyUpdates()', async () => {
    let updatedDescription = processor.applyUpdates('(General)\n' +
        'Large Disruptor-Armed Freighter\n' +
        'BPV: 75\n' +
        'Ref: R1.21\n' +
        'Book: Captain\'s Advanced Missions SSD Book', {type: 'F-AL'});
    expect(updatedDescription).toEqual(
        '(General)\n' +
        'Large Disruptor-Armed Freighter\n' +
        'Type: F-AL\n' +
        'BPV: 75\n' +
        'Ref: R1.21\n' +
        'Book: Captain\'s Advanced Missions SSD Book'
    );

    updatedDescription = processor.applyUpdates('(General)\n' +
        'Large Disruptor-Armed Freighter\n' +
        'Type: F-AL\n' +
        'Ref: R1.21\n' +
        'Book: Captain\'s Advanced Missions SSD Book', {bpv: '75'});
    expect(updatedDescription).toEqual(
        '(General)\n' +
        'Large Disruptor-Armed Freighter\n' +
        'Type: F-AL\n' +
        'BPV: 75\n' +
        'Ref: R1.21\n' +
        'Book: Captain\'s Advanced Missions SSD Book'
    );

    updatedDescription = processor.applyUpdates('(General)\n' +
        'Large Disruptor-Armed Freighter\n' +
        'Type: F-AL\n' +
        'BPV: 75\n' +
        'Book: Captain\'s Advanced Missions SSD Book', {reference: 'R1.21'});
    expect(updatedDescription).toEqual(
        '(General)\n' +
        'Large Disruptor-Armed Freighter\n' +
        'Type: F-AL\n' +
        'BPV: 75\n' +
        'Ref: R1.21\n' +
        'Book: Captain\'s Advanced Missions SSD Book'
    );

    updatedDescription = processor.applyUpdates('(General)\n' +
        'Large Disruptor-Armed Freighter\n' +
        'Type: F-AL\n' +
        'BPV: 75\n' +
        'Ref: R1.21', {book: 'Captain\'s Advanced Missions SSD Book'});
    expect(updatedDescription).toEqual(
        '(General)\n' +
        'Large Disruptor-Armed Freighter\n' +
        'Type: F-AL\n' +
        'BPV: 75\n' +
        'Ref: R1.21\n' +
        'Book: Captain\'s Advanced Missions SSD Book\n'
    );

    updatedDescription = processor.applyUpdates('(General)\n' +
        'Large Disruptor-Armed Freighter\n' +
        'Book: Captain\'s Advanced Missions SSD Book', {bpv: '75'});
    expect(updatedDescription).toEqual(
        '(General)\n' +
        'Large Disruptor-Armed Freighter\n' +
        'BPV: 75\n' +
        'Book: Captain\'s Advanced Missions SSD Book'
    );
});
