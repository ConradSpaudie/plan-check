import type { SourceRef } from "./types";

/** Every rule in the engine points to one or more of these. All URLs came from the research report. */
export const SRC = {
  commonProblems: {
    label: "Society for Science: Common SRC problems",
    url: "https://www.societyforscience.org/isef/common-scientific-research-committee-src-problems/",
  },
  failToQualify: {
    label: "Society for Science: Reasons for failing to qualify",
    url: "https://www.societyforscience.org/isef/international-rules/fail-to-qualify",
  },
  rulesAll: {
    label: "ISEF Rules for All Projects",
    url: "https://www.societyforscience.org/isef/international-rules/rules-for-all-projects/",
  },
  formsPage: {
    label: "ISEF Forms (2027)",
    url: "https://www.societyforscience.org/isef/forms/",
  },
  overview: {
    label: "ISEF Overview of Forms and Dates",
    url: "https://www.societyforscience.org/isef/overview-of-forms-and-dates/",
  },
  rulesBook2526: {
    label: "ISEF Rules 2025-26 (for the old form numbers)",
    url: "https://stem.idaho.gov/wp-content/uploads/IDSEF/2025-26-ISEF-Rules-Book-Final-Version.pdf",
  },
  rulesBook2627: {
    label: "ISEF International Rules 2026-2027",
    url: "https://www.trine.edu/science-fair/ISEF%20Rules%202026-2027.pdf",
  },
  human: {
    label: "ISEF Human Participants rules",
    url: "https://www.societyforscience.org/isef/international-rules/human-participants/",
  },
  form4: {
    label: "ISEF Form 4: Human Participants",
    url: "https://sspcdn.blob.core.windows.net/files/Documents/SEP/ISEF/2027/Forms/4-Human-Participants.pdf",
  },
  form1: {
    label: "ISEF Form 1: Adult Sponsor checklist",
    url: "https://sspcdn.blob.core.windows.net/files/Documents/SEP/ISEF/2027/Forms/1-Checklist-for-Adult-Sponsor.pdf",
  },
  form1B: {
    label: "ISEF Form 1B: Approval Form",
    url: "https://sspcdn.blob.core.windows.net/files/Documents/SEP/ISEF/2027/Forms/1B-Approval-Form.pdf",
  },
  form2A: {
    label: "ISEF Form 2A: Student Support Disclosure",
    url: "https://sspcdn.blob.core.windows.net/files/Documents/SEP/ISEF/2027/Forms/2A-Student-Support-Disclosure-Form.pdf",
  },
  form2C: {
    label: "ISEF Form 2C: Regulated Research Institution",
    url: "https://sspcdn.blob.core.windows.net/files/Documents/SEP/ISEF/2027/Forms/2C-Regulated-Research-Institution.pdf",
  },
  form7: {
    label: "ISEF Form 7: Continuation",
    url: "https://sspcdn.blob.core.windows.net/files/Documents/SEP/ISEF/2027/Forms/7-Continuation.pdf",
  },
  phba: {
    label: "ISEF Potentially Hazardous Biological Agents rules",
    url: "https://www.societyforscience.org/isef/international-rules/potentially-hazardous-biological-agents/",
  },
  tissue: {
    label: "ISEF Tissue and Body Fluid rules",
    url: "https://www.societyforscience.org/isef/international-rules/tissue-and-body-fluid/",
  },
  aiTable: {
    label: "Society for Science: Generative AI Use Table",
    url: "https://sspcdn.blob.core.windows.net/files/Documents/SEP/ISEF/2026/Rules/Generative-AI-Use-Table.pdf",
  },
  pittsburgh: {
    label: "Pittsburgh PRSEF Guide to Scientific Review",
    url: "https://carnegiesciencecenter.org/wp-content/uploads/2022_guide_to_scientific_review.pdf",
  },
  denver: {
    label: "Denver Science Fair SRC guide",
    url: "https://clas.ucdenver.edu/denversciencefair/node/508/attachment",
  },
  charlotte: {
    label: "UNC Charlotte: mandatory ISEF forms",
    url: "https://cstem.charlotte.edu/events/science-engineering-fair-region-6/forms/mandatory-isef-forms",
  },
  missouri: {
    label: "Missouri State fair tips",
    url: "https://k12science.missouristate.edu/FairTips.htm",
  },
  floridaDirections: {
    label: "Florida SSEF research plan directions 2026-27",
    url: "https://www.stjohns.k12.fl.us/stem-fair/wp-content/uploads/sites/182/2026/06/Research-Plan-Directions-2026-2027.pdf",
  },
  floridaSupplement: {
    label: "Florida SSEF rules supplement 2026-27",
    url: "https://www.stjohns.k12.fl.us/stem-fair/wp-content/uploads/sites/182/2026/06/2026-2027-Florida-SSEF-Rules-Supplement.pdf",
  },
  georgia: {
    label: "Georgia GSEF research plan instructions",
    url: "https://www.georgiacenter.uga.edu/wp-content/uploads/2025/07/gsef-research-plan-project-summary-instructions.pdf",
  },
  colorado: {
    label: "Colorado CSEF SRC",
    url: "https://csef.natsci.colostate.edu/src",
  },
  oregon: {
    label: "Oregon research plan handout",
    url: "https://www.wlwv.k12.or.us/cms/lib/OR01001812/Centricity/Domain/1012/Research%20Plan%20Instructions%20for%20Website.pdf",
  },
  scienceBuddies: {
    label: "Science Buddies: SRC how to get started",
    url: "https://www.sciencebuddies.org/science-fair-projects/competitions/src-how-to-get-started",
  },
  srcGuidelines: {
    label: "SRC Operational Guidelines (Montana Tech copy)",
    url: "https://institute.mtech.edu/wp-content/uploads/2021/11/SRC-Operational-Guidelines.pdf",
  },
  scvsefa: {
    label: "SCVSEFA: 2027 changes from previous rules",
    url: "https://science-fair.org/2027-changes-from-previous-rules-procedures/",
  },
  faq: {
    label: "ISEF FAQ",
    url: "https://www.societyforscience.org/isef/faq/",
  },
} satisfies Record<string, SourceRef>;
