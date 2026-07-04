# Create fitness app mockup

> I am working on proposal and tasked with the Look and Feel
>
> Required item: Can you create an initial 1-page mockup of the core feature using HTML/CSS only of following application, I will add more to it after:
>
> Short Summary A web-based fitness platform that generates personalized workout and nutrition plans using AI. Users provide their fitness goals, experience level, available equipment, and dietary preferences through an onboarding assessment. The platform then creates a customized weekly plan and continuously adapts future recommendations based on user progress and performance.
>
> Major Functionalities AI-Powered Fitness Plan Generation The core of the application is a structured AI workflow that generates personalized workout and nutrition plans. User information is processed through multiple stages: Goal Analysis → Exercise Selection → Nutrition Planning → Schedule Generation The system considers factors such as fitness goals, available equipment, experience level, and dietary restrictions to create a complete weekly plan tailored to each user.
>
> Adaptive Progress Tracking and Feedback System Users log completed workouts and nutrition data through an interactive dashboard. The platform analyzes this performance data and automatically adjusts future recommendations. Examples include: Increasing or decreasing workout intensity based on completion rates. Recommending alternative exercises when users consistently skip certain movements. Adjusting calorie and macronutrient targets according to progress toward goals. This creates a continuous feedback loop where the generated plans evolve based on real user behavior rather than remaining static.
>
> Originality Unlike traditional fitness applications that provide generic workout templates, this platform focuses on intelligent adaptation. The application treats fitness planning as an evolving process rather than a one-time recommendation.

<details><summary>6 previous messages</summary>

> I’ll add a focused HTML/CSS-only mockup for the core AdaptFit experience, keeping it proposal-friendly and easy to reference from the README. First I’m checking the repo shape so I put it somewhere sensible without disturbing existing work.
>
> The repo is currently very lean: just `README.md`, with a clean worktree. I’m going to create a standalone mockup file at the root so it can be linked or submitted directly as the Look and Feel artifact.
>
> I found the README already has a Look and Feel placeholder, so I’ll wire the new mockup into that section too. The mockup will show the core screen: today’s adaptive plan, weekly workout schedule, nutrition targets, and progress signals that explain why the plan changed.
>
> <details><summary>Created a file</summary>
>
> - Wrote `./mockups/core-feature.html` (+728 -0)
>
> </details>
>
> The mockup file is in place. I’m doing a quick pass now to connect it from the proposal README and catch any obvious HTML/CSS issues before I hand it back.
>
> <details><summary>Edited a file</summary>
>
> - Wrote `./README.md` (+9 -9)
>
> </details>

</details>

Created the HTML/CSS-only mockup here:

[core-feature.html](./mockups/core-feature.html)

I also updated the proposal README Look and Feel section to point to it:

[README.md](./README.md)

The mockup shows the core AdaptFit dashboard: adaptive workout recommendation, weekly schedule, nutrition targets, progress tracking, and AI insight explanations. It’s a standalone static page, so you can open the HTML file directly in a browser.

> Can you seperate the 1 large file into seperate html and css.

<details><summary>8 previous messages</summary>

> Got it. I’ll split the embedded styles out into a separate CSS file and keep the HTML referencing it cleanly.
>
> I’ve got the current file open. I’m going to move the entire `<style>` block into `mockups/core-feature.css` and replace it with a normal stylesheet link in the HTML head.
>
> <details><summary>Edited a file</summary>
>
> - Wrote `./mockups/core-feature.html` (+1 -527)
>
> </details>
>
> The HTML now points to an external stylesheet. Next I’m adding the CSS file with the same styles, plus a tiny cleanup so the progress bar colors are no longer inline in the HTML.
>
> <details><summary>Created a file</summary>
>
> - Wrote `./mockups/core-feature.css` (+545 -0)
>
> </details>
>
> CSS is separated now. I’m removing the remaining inline bar styles so the mockup is cleaner HTML/CSS separation.
>
> <details><summary>Edited a file</summary>
>
> - Wrote `./mockups/core-feature.html` (+3 -3)
>
> </details>
>
> The split is done; I’m checking the diff and file list now to make sure the link path and new stylesheet are exactly where the browser expects them.

</details>

Separated it into:

[core-feature.html](./mockups/core-feature.html)
[core-feature.css](./mockups/core-feature.css)

The HTML now links the stylesheet with:

```html
<link rel="stylesheet" href="core-feature.css" />
```

I also removed the remaining inline progress-bar styles, so the mockup is cleanly split between HTML structure and CSS styling.
