# Star Fleet Battles SSD Organizer

Lots of scattered utility code, to assist in my personal project to digitize all my circa 1983 Star Fleet Battles material.  (Star Fleet Battles is the best tabletop space simulation game, ever.)

Back in the day when I was a regular player, I would buy books of SSDs (ship pages for game play) whenever I could afford them, and then beg, borrow, or steal access to a photocopier to we could play.  Eckerds stores had a photocopier, but they were 25 cents per copy (coin operated!), and later Kinkos would let you make self-serve copies for 15 cents a page.  At my mom's office or at other places I worked I could sometimes get access to a copier for free, but no one had them at home back then.

Over time, I mounded up a huge collection of SSD sheets, and we would put them into transparencies and use transparency markers or (better) grease pens to write on them without messing up the photocopy.  This collection was organized into accordion folders by race, and kept in file-folder boxes until 2019 when my wife was applying the Konmari method to our whole property.

Then I set out to digitize all the SSDs so that the originals (in books) and all the photocopies can be thrown away.  I figure if I want to play in 2019, I can search Google Drive for a PDF of the SSD I want, print out a copy, and write on that copy to record damage.

# Digitizing Process

- The scanner I have is not duplex, but it scans one side of a page at a time.
- I went to OfficeDepot and had them cut the bindings off of all the original SSD books.
- I scanned the cover and other non-SSD pages into one multi-page PDF, and then scanned each SSD into its own one-page PDF file.
- When scanning each of the PDFs, OCR is applied to make them searchable PDFs.
- The searchable PDF files are put in a directory that Google Backup & Sync is monitoring, so the files get uploaded into Drive.
- The OCR applied is pretty good, but not perfect, so I wanted more accurate metadata about each file.
- I went through a few books worth of SSDs and added some metadata in Drive's `Description` field for each file, containing the `Name`, `Type`, `BPV`, and `Reference`.  But this manual process was taking a long time, so I created this project.

## Goals

The SsdParser class here is meant to peek at the sparse searchable text in the PDF file of an SSD, and from that try to glean the `Name`, `Type`, `BPV`, and `Reference` values for the SSD.

The GoogleDriveWalker class is meant to aid in walking through the SSDs in Google Drive, downloading each one, applying the SsdParser to determine the metadata, and then apply a best-guess `Description` containing that info.

After this is done for every file, some manual cleanup will have to be done for each file, to correct errors made by the parser and to add metadata for ships where nothing could be determined.

It is also possible to include `properties` as individual fields, and these can be public and searchable.  It's not clear to me whether these will appear in the regular Drive UI.  If not, there's not too much use here.  But if there's a way to have a `minBpv` and `maxBpv` for a ship, counting refits and options, I can see some cool things being done with it.

## Post-digitization

I'll need to go through all the remaining printed copies.  The ones from the de-spined books to make sure each SSD got captured (though I checked the page counts pretty carefully when scanning), and the ones from the accordion folders to make sure that I didn't have a something there that came from a missing book.

Then, ultimately, all the papers can be thrown away, which is the Konmari goal.

# Follow Ups

## Rules

After all that, I'll have to decide what to do with the rule book(s).  I have one big book, and several smaller books, and lots of expansion modules with their own rules.  I think I'll combine them into two physical notebooks, with Ships and Scenarios in a separate folder (sections `R` and `S`) from the rest of the actual rules.  Once I have a complete set with every rule, I'll scan all of these, because a searchable PDF would be super handy for quickly finding rules while playing.

## Collecting Missing Pieces

I have a ton of SFB stuff, but not everything.  If having it all in one place and can see what I'm missing, and it's not too much, I can make a list of things to collect.  Much of this is available in e-Book form, so I might just download the missing parts to make the collection complete--or look on eBay for old version to digitize (and unfortunately, destroy).

## Play the Game

There's an online service for aiding remote tabletop play.  I'll have to try it out.  Also, I've been working on a training series for others interested in learning to play the game.

