# Real research-plan fixtures: sources

All text was pulled with a web-to-text extractor (Exa page fetch), not copied by hand from the PDF layout. Line breaks follow the extractor's output, which can differ from the original PDF (some lists came out as run-on lines). Changes I made: removed page chrome (repeated running headers such as the student name at the top of each page, site navigation, and surrounding non-plan pages), and changed curly quotes and apostrophes to straight ASCII ones. Nothing else was reworded or fixed, so typos and odd phrasing in the originals are still there.

Quality labels: "sample" means the source calls it a sample or example but does not say whether it is good or bad. None of the sources marks a plan as a poor example.

**Coverage gap:** I could not find a complete, publicly posted human-participants plan written as a real study. I also could not find an engineering or computational plan in ISEF format. Almost every "human participants research plan" hit was a blank template (PRSEF, Riverside COE, Charlotte, Georgia, and others). The human-participants fixture below is the participants section of a template that comes with filled-in example text.

---

## 1. westga-biochar-sample.txt
- **Source URL:** https://www.westga.edu/assets/wgrsef/docs/sample-forms.pdf
- **Title:** West Georgia Regional Science and Engineering Fair, "Sample Forms", High School section, "Sample Research Plan" ("Jane Doe, 11th grade, Douglas County High School")
- **Label:** Listed as "Sample Research Plan" in the packet's table of contents. No good or poor rating. The packet's middle-school sample plan did not come through in the text extraction (probably an image) and is not included.
- **Completeness:** Complete as extracted: Purpose/Research Question, Hypothesis, Procedures/Calculations/Data Analysis, Bibliography, Websites. It has **no Rationale heading and no Risk and Safety section** (CuSO4 is handled with no safety text), and Data Analysis is only a "% change" calculation. A checker should flag these gaps; they are not false positives.
- **Project involves:** Hazardous chemical (copper sulfate solution, alcohol for cleaning). Equipment that implies an outside lab: an FEI Quanta 200 SEM with a Bruker EDS. No humans, animals or microorganisms. Food materials (nut shells).

## 2. docest-sample3-hand-sanitizer-bacteria.txt
- **Source URL:** https://docest.com/doc/248431/research-plan-sample-1 (third plan on the page)
- **Title:** "Research Plan Sample 3" (hand sanitizer effectiveness)
- **Label:** Titled "Sample". No good or poor rating. docest.com is a document-reupload site; the original host is unknown, and the Carrolltown, PA dentist named in Sample 1 suggests a Pennsylvania school. In practice the plan is weak: a one-sentence rationale, a non-testable hypothesis, misnumbered steps, an empty Bibliography, and vague "appropriate statistical analysis".
- **Completeness:** Complete as posted, including an appended "Potentially hazardous biological agents research" paragraph.
- **Project involves:** Microorganisms: environmental and skin bacteria are cultured on nutrient agar at 37 C. It states BSL-1, qualified scientist supervision, autoclave/heat disposal and restricted storage. Hand sanitizer is a mild chemical hazard. The student swabs gloves they wear themselves, so the student is the only human involved. School setting.

## 3. docest-sample1-teeth-acid.txt
- **Source URL:** https://docest.com/doc/248431/research-plan-sample-1 (first plan on the page)
- **Title:** "Research Plan Sample 1" (toothpaste vs. acid erosion on teeth)
- **Label:** Titled "Sample". No good or poor rating, but it is clearly weak: there is **no Risk and Safety section** (only a "Risk/Benefits" line that is off-topic), no bibliography, and the hypothesis wording is confused.
- **Completeness:** Complete as posted (Rationale, Hypothesis, Procedure, Risk/Benefits, Data Analysis). The same page also has "Research Plan Sample 2" (acids decomposing chicken bones), which I did not save.
- **Project involves:** Human tissue edge case: extracted human teeth from a named dentist, autoclaved before pickup. Soda and toothpaste. No live participants, animals or cultures.

## 4. docest-mencias-teg-outside-lab.txt
- **Source URL:** https://docest.com/doc/617957/mackenzie-mencias
- **Title:** "[Student name], Research Plan" (thromboelastography in trauma patients and patients on novel oral anticoagulants)
- **Label:** No label. This looks like a real student's submitted plan reposted on docest, not a teaching sample. The fixture keeps the student's name as it appears in the source.
- **Completeness:** Complete: Rationale, Research Question, Hypothesis, Expected Outcomes, Procedure, Risk and Safety, Data Analysis, Bibliography.
- **Project involves:** Outside lab or clinical setting: TEG 5000/6S instruments, reagent maintenance, and data entry for an existing clinical study. Human data: existing clinical and lab data from trauma and anticoagulant patients, which the plan says the student receives de-identified. The plan does not mention a human-participants form or IRB. Blood products are handled by others. A good test for "secondary human data at a research institution" rules and for "Risk and Safety: no potential risks".

## 5. sefh-ann-jalapeno-plant.txt
- **Source URL:** https://sefhouston.org/wp-content/uploads/Anns-Project.pdf
- **Title:** "Ann's Scientific Inquiry Investigation", section "Ann's Research Plan for Scienteer" (Enhancing Jalapeno Pepper Production)
- **Label:** A teaching walkthrough from the Science and Engineering Fair of Houston, presented as the model to follow. Not a real student. Partly narrated in the third person ("Ann will...", "She added here that...").
- **Completeness:** Only the research-plan section, from "Ann's Research Plan for Scienteer" to the end of the bibliography part. I left out the earlier topic-finding narrative and Ann's post-experiment data tables. The official ISEF instruction prompts (RATIONALE: ..., Procedures: Detail all procedures...) are mixed into the plan text in the source and kept that way. The bibliography is a promise ("She will have 2 plant books and 3 internet sites"), not actual references.
- **Project involves:** Plants (jalapeno). Commercial soil microbial enhancer; the plan argues this is exempt because nothing is cultured. Garden gloves for the capsaicin. Home/garden setting. No humans or vertebrates.

## 6. umvsd-pyrogel-fire-materials.txt
- **Source URL:** https://ohioumvsd.com/pdf/students/sample-final-research-paper-1-grade-9.pdf
- **Title:** Upper Miami Valley Science Day, "Sample Research Plan / Final Paper No. 1", "Pyrogel, the Future of Fire Defense" (Thomas Chaney, Tippecanoe High School, Grade 9)
- **Label:** Labeled "Sample Research Plan / Final Paper". The cover note says the student "should have included more discussion in both the results and the conclusions", which is mild criticism of the results and discussion, not of the plan. It is not ISEF Form 1A format: the headings are Question/Hypothesis/Research/Procedures/Materials/Works Cited.
- **Completeness:** **Partial.** I saved only the plan-stage parts: the title through Materials, plus Works Cited. I left out the cover instructions, the raw temperature data tables, the empty "Flame Test Averages / Observations / Heat Test Summary" headings and the Conclusion, because they are post-experiment. The bracketed teacher notes inside the title, question and hypothesis are in the source and were kept.
- **Project involves:** Hazardous activities and devices: open flame from 1 ml of 91% isopropyl alcohol lit with a lighter, a toaster oven at 232 C, insulation materials (fiberglass, rock wool, aerogel). Fire extinguisher and goggles appear in Materials, but the plan has **no Risk and Safety section**. Engineering/materials-testing flavor. No humans, animals or microbes. Home or school setting.

## 7. studylib-human-participants-running-example.txt
- **Source URL:** https://studylib.net/doc/8993555/editable-research-plan-template
- **Title:** "Research Plan Template for Science Projects", section "Human Participants Research"
- **Label:** A template with filled-in example text (a running-time and shoe survey with classmates). It is a model answer, not a real student's plan, and it still contains blanks ("range in age from ______") and a template note ("<-- only include this sentence if...").
- **Completeness:** **Partial.** Only the Human Participants Research section. I left out the top half of the template (Purpose, Hypothesis, Materials, Procedure, Data Analysis), which has instructions only, and the generic "Hazardous Chemicals, Activities & Devices" boilerplate paragraph.
- **Project involves:** Human participants who are minors (classmates), recruited by the researcher with parent permission. Physical activity (running at a track) plus a survey. Privacy by letter codes, with records shredded. Mentions informed consent, but the wording is inconsistent ("have been notified" is past tense).

---

### Candidates checked and rejected (blank templates or not plans)
- PRSEF/SCVSEFA "Research Plan for projects involving Human Participants": https://science-fair.org/wp/wp-content/uploads/2026/01/Research-Plan-Human-Participants.docx.pdf (blank template)
- Riverside COE research plan templates (rcoe.us showpublisheddocument 7883/7885/7887; blank)
- Charlotte (cstem.charlotte.edu) Research-Plan.pdf and the Georgia GSEF Form 1A (ISEF instructions only)
- ARASE "Research Plan Sample": https://www.arase.org/docs/ResearchPlanSample.pdf (only Rationale/Question/Hypothesis filled in; the rest is instructions)
- SARSEF virtual fair HS-BEH22 "research paper" (a final report, not a plan)
- Shuling Lin ISEF paperwork: https://users.wpi.edu/~slin4/pdfs/IsefPaperwork-77.pdf. A real Research Plan/Project Summary page for Drosophila and microplastics, but only a short project description; it says "The rest of the Project Plan will be attached in a PDF", and that attachment was not found.
