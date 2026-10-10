import type { FormDates, Profile } from "./engine/types";

export interface Sample {
  id: "weak" | "strong";
  label: string;
  blurb: string;
  plan: string;
  profile: Profile;
  dates: FormDates;
  deadline?: string;
}

const base: Profile = {
  humans: false,
  vertebrates: false,
  phba: false,
  hazards: false,
  outsideSite: false,
  continuation: false,
  team: false,
  usesAI: false,
};

/** A deliberately flawed plan, so the first run shows what Plan Check catches. Invented for demonstration. */
export const WEAK_SAMPLE: Sample = {
  id: "weak",
  label: "A plan with problems",
  blurb: "A made-up survey project with the usual mistakes.",
  plan: `Does Caffeine Change Reaction Time in Teenagers?

Background
Caffeine is a stimulant. Many teens drink energy drinks. I want to see if caffeine makes reaction time faster.

Hypothesis
I think caffeine will make reaction times faster.

Materials
Caffeine pills, water, a computer, stopwatch, some cups

Procedure
Several students from my school will be recruited as participants. Some will take a caffeine pill and some will not. Then their reaction time is tested on a website. The results will be written down. Standard procedure will be used for the test. The test is repeated as needed. Data will be collected for a few weeks. My teacher will sign Form 2 and Form 1C.

Safety
N/A

Data analysis
I will compare the groups.

Bibliography
https://www.healthline.com/nutrition/caffeine
https://en.wikipedia.org/wiki/Caffeine
Smith. Caffeine and sport.`,
  profile: { ...base },
  dates: {
    start: "2026-11-02",
    end: "2026-12-15",
    f1: "2026-11-02",
    f1B_student: "2026-10-28",
    f1B_parent: "2026-11-05",
  },
  deadline: "2026-10-30",
};

/** A reasonably complete plan, so the report shows what a clean result looks like. Invented for demonstration. */
export const STRONG_SAMPLE: Sample = {
  id: "strong",
  label: "A stronger plan",
  blurb: "A made-up plant-growth project with the required sections.",
  plan: `Effect of LED Light Color on the Growth of Lettuce (Lactuca sativa)

Rationale
Plants absorb red and blue light most strongly for photosynthesis [1][2]. Indoor growers use LED grow lights, but the best mix of colors for leafy greens is still debated [3]. Earlier work found that adding blue light to red light increased leaf area in lettuce, while too little red light slowed growth [2][4]. Home growers pay for the electricity these lights use, so choosing a color that works better can lower cost [5]. This project tests whether three LED color treatments change the fresh mass of lettuce seedlings over 21 days compared with white light.

Research question and hypothesis
Research question: Does LED light color (red, blue, or a red-blue mix) change the fresh mass of lettuce grown for 21 days?
Hypothesis: I predict the red-blue mix will give the highest mean fresh mass because it matches the absorption peaks of chlorophyll. I expect blue-only light to give the lowest mass.

Materials
4 LED strips, 12 V, 10 W each: red (660 nm), blue (450 nm), red-blue mix, and white as the control
40 lettuce seeds (Butterhead), bought from a garden supplier
20 plastic pots, 10 cm wide, and 2 L of potting mix
Digital scale (0.01 g), ruler, light meter, 12 V adapters, 4 plywood grow boxes, timer

Procedure
1. I will build four identical grow boxes in the school science room. My teacher, who is my adult supervisor, will check the wiring before first use.
2. I will plant 2 seeds in each of 20 pots, 5 pots per treatment, and thin to 1 seedling per pot after 7 days.
3. I will set each light to the same 200 µmol per square meter per second at pot height, measured with the light meter, and run each light for 14 hours per day on a timer.
4. I will water each pot with 50 mL of tap water every second day so that water is the same for all treatments.
5. I will keep temperature at 21 °C by using the same room for all boxes, and I will record it daily.
6. After 21 days I will cut each plant at soil level, weigh it on the scale to 0.01 g, and record the fresh mass. I will repeat the full experiment 3 times.
7. I will keep light intensity, water, pot size and soil constant. The independent variable is light color and the dependent variable is fresh mass.

Risk and safety
The LED strips run on a 12 V adapter, so no high voltage is exposed. I will keep all adapters away from water and my teacher will check them before use. I will wear safety glasses and gloves when cutting plywood and handling soil. Potting mix dust can irritate the lungs, so I will dampen it before handling. Used soil and plants will be disposed of in the school compost bin. No chemicals, animals or people are involved.

Data analysis
For each treatment I will calculate the mean and standard deviation of fresh mass with n = 5 pots per treatment per trial. I will graph the means with error bars and compare the four treatments using a one-way ANOVA with a Tukey follow-up test at a significance level of 0.05, using Python.

Acknowledgements
My science teacher supervised the build and wiring. I did not use generative AI to write this plan.

Bibliography
[1] Taiz, L., Zeiger, E. (2015). Plant Physiology and Development. Sinauer Associates.
[2] Kim, H.-H., Goins, G. D., Wheeler, R. M., & Sager, J. C. (2004). Green-light supplementation for enhanced lettuce growth under red- and blue-light-emitting diodes. HortScience, 39(7), 1617-1622. doi:10.21273/HORTSCI.39.7.1617
[3] Pennisi, G., et al. (2019). Optimal light intensity for sustainable water and energy use in indoor cultivation of lettuce. Agricultural Water Management, 226, 105815. doi:10.1016/j.agwat.2019.105815
[4] Wollaeger, H. M., & Runkle, E. S. (2014). Growth of impatiens, petunia, salvia, and tomato seedlings under blue, green, and red LEDs. HortScience, 49(6), 734-740.
[5] U.S. Department of Energy (2020). Energy savings potential of solid-state lighting in general illumination applications. https://www.energy.gov/eere/ssl
[6] Morrow, R. C. (2008). LED lighting in horticulture. HortScience, 43(7), 1947-1950. https://doi.org/10.21273/HORTSCI.43.7.1947`,
  profile: { ...base },
  dates: {
    start: "2026-11-09",
    end: "2026-12-14",
    f1: "2026-10-30",
    f1B_student: "2026-10-28",
    f1B_parent: "2026-10-28",
  },
  deadline: "2026-11-20",
};
