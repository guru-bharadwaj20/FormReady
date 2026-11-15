# 1. Problem statement

## The wall every applicant hits

Almost every Indian examination and government portal asks applicants to upload
a photograph, a signature and one or more scanned documents, and almost every
one of them rejects files that are a few kilobytes or a few pixels off
specification. Typical rules look like this:

| Asset       | Typical rule                                                  |
| ----------- | ------------------------------------------------------------- |
| Photograph  | JPG, 20 to 50 KB, 3.5 cm x 4.5 cm, 200 DPI, plain background  |
| Signature   | JPG, 10 to 20 KB, 140 x 60 px, black ink on white             |
| Certificate | PDF, under 300 KB (sometimes 1 MB), A4, one file per document |

Each portal has its own set, and the rules change between notifications
without announcement. SSC, UPSC, NEET, JEE, CUET, state PSCs, railway RRB,
banking IBPS/SBI, Passport Seva, PAN, EPFO, scholarships and visas together
handle tens of millions of applications a year. The SSC and RRB applicant
pools alone run into the crores.

## What people do today

- Ad-covered "resize to 20 KB" websites that upload the applicant's face and
  signature to an unknown server.
- WhatsApp forwards describing MS Paint tricks that rarely land in the KB range.
- A cyber cafe counter charging Rs 30 to Rs 100, with a queue on deadline day.

None of these tell the applicant _why_ the portal rejected the file, none work
offline, and none keep the data on the device.

## The gap

Nobody maintains an open, machine-readable registry of portal upload
specifications, and nobody has paired such a registry with a private,
offline, one-click fixer that validates the output against it before the
applicant uploads.

## Who we are building for

The primary persona is a first-time applicant on a low-end Android phone with
patchy data, often on the last evening before a deadline. Secondary personas
are coaching-centre and Common Service Centre (CSC) operators who process many
applicants a day on a shared desktop, and contributors who keep the spec
registry accurate.

## Success criteria

1. An applicant can pick their portal, drop in a file, and download an output
   that passes the portal's upload validation on the first try.
2. Every check is shown as a plain-language pass/fail line so the applicant
   can see why the file passed.
3. No byte of user data leaves the browser. There is no backend and no
   analytics.
4. The app works with no network after the first load.
5. The spec registry is correctable by anyone through a pull request.

## Non-goals (v1)

- Filling the portal form itself or automating the upload.
- Editing beyond what compliance requires (no beautification, retouching).
- Native mobile apps. The PWA is the mobile story.
- Any server-side component, account system or data storage.
