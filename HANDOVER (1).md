# Round 1 --- Memory Card Matching Game

## Handover Document

### 1. Project Overview

This project contains the Memory Card Matching Game for **Round 1** of
the team competition.

The game is team-based, but only **one player from a team plays this
game**.

The gameplay flow is:

**Team → One player plays → Player completes the game → Score is
calculated → Score is submitted to the team → Team scoreboard is updated
→ Round 1 is finished**

The other teammates do not need to play this game.

------------------------------------------------------------------------

## 2. Round 1 Game Rule

-   Game: Memory Card Matching Game
-   Round: Round 1
-   Game identifier: `game1` (if this is the identifier used by the
    existing project)
-   One player from each team participates.
-   The participating player's final score is added to the team's
    scoreboard.
-   The game does not wait for other teammates.
-   There is no requirement for all teammates to complete the game.
-   After successful score submission and server confirmation, Round 1
    is finished for this game.

------------------------------------------------------------------------

## 3. Project Structure

The relevant project structure is:

``` text
mini games/
├── games/
│   └── game1/
│       ├── index.html
│       ├── style.css
│       └── game.js
├── data/
│   └── games.db
├── index.html
├── server.js
├── package.json
├── package-lock.json
└── .gitignore
```

### Game files

-   `games/game1/index.html` --- game page and HTML structure
-   `games/game1/style.css` --- game styling and responsive layout
-   `games/game1/game.js` --- memory game logic, score calculation, and
    result submission

### Server/database

-   `server.js` --- existing Node.js server and API layer
-   `data/games.db` --- existing SQLite database used by the project
-   `package.json` --- project dependencies and scripts

------------------------------------------------------------------------

## 4. Gameplay

The player sees a set of face-down memory cards.

The player:

1.  Selects a card.
2.  Selects a second card.
3.  If the two cards match, they remain revealed.
4.  If they do not match, they are turned face down again.
5.  The player continues until all pairs are matched.

The game prevents invalid actions such as selecting the same card twice,
selecting a third card while two cards are being checked, or selecting
cards that have already been matched.

The original development specification requires a lightweight
HTML/CSS/Vanilla JavaScript implementation and does not require image
assets or a continuous animation/game loop.

------------------------------------------------------------------------

## 5. Score

The player's score is calculated locally using the game's scoring rules.

The score can take into account:

-   Number of moves
-   Elapsed time
-   Base score

The score should not become negative.

The important competition rule is that the score belongs to the **team
scoreboard** after submission.

There is only one score submission for this game from the participating
player.

------------------------------------------------------------------------

## 6. Team Identification

The game uses the existing project's team identification mechanism.

The game must receive the correct `teamId` from the existing
launcher/routing system.

Do not create a separate team system.

If the existing project passes a team ID through the URL, it may use a
structure such as:

``` text
/games/game1/?teamId=TEAM123
```

The actual mechanism in the existing project should be treated as the
source of truth.

------------------------------------------------------------------------

## 7. Score Submission

After all pairs are matched:

1.  Calculate the final score.
2.  Submit the result to the existing backend.
3.  Include the team's `teamId`.
4.  Identify the game using the existing `game1` convention.
5.  Wait for the server response.
6.  Only after successful server confirmation, tell the player that the
    score has been added.
7.  Finish Round 1.

The existing development specification describes the solve request
using:

``` text
POST /api/games/solve
```

with information such as:

``` json
{
  "teamId": "TEAM123",
  "playerSlot": "game1",
  "score": 850,
  "completedAt": "..."
}
```

The actual API contract in `server.js` should be used if it differs from
this example.

------------------------------------------------------------------------

## 8. Important: One Player Only

This game is **not** a four-player completion requirement.

Do not add or restore logic that:

-   waits for teammates
-   requires all teammates to play
-   combines multiple players' scores
-   polls for teammate completion
-   waits for team-wide game completion
-   creates a separate teammate status system

The correct flow is:

``` text
ONE PLAYER
    ↓
PLAY MEMORY GAME
    ↓
COMPLETE ALL PAIRS
    ↓
CALCULATE SCORE
    ↓
SUBMIT SCORE
    ↓
SERVER CONFIRMS
    ↓
TEAM SCOREBOARD UPDATED
    ↓
ROUND 1 COMPLETE
```

------------------------------------------------------------------------

## 9. Completion Screen

After successful server confirmation, the player should see a completion
state similar to:

``` text
ROUND 1 COMPLETE

Your Score: XXX

Score added to your team scoreboard.
```

The game should not ask another teammate to play.

------------------------------------------------------------------------

## 10. Running the Project Locally

From the project root:

``` powershell
cd "D:\DTD\mini games"
```

Install dependencies if needed:

``` powershell
npm install
```

Start the project using the existing command defined in `package.json`.

For example, if the project uses:

``` powershell
npm start
```

run that command.

Then open the local address shown by the server, commonly:

``` text
http://localhost:3000
```

Use the project's existing launcher to enter Round 1 rather than
creating a separate route.

------------------------------------------------------------------------

## 11. Git / Collaboration

This project is being developed collaboratively.

The current personal branch is:

``` text
taj
```

The intended workflow is:

``` text
main
  ↓
taj
  ↓
Make changes
  ↓
Commit
  ↓
Push taj to GitHub
  ↓
Pull Request
  ↓
Review / merge into main
```

Do not push Round 1 changes directly to `main`.

Before committing, make sure local secrets such as `.env` or
`.env.local` are not committed.

`node_modules/` and `.venv/` should remain ignored by Git.

------------------------------------------------------------------------

## 12. Handover Notes

The next developer should:

1.  Open the actual project root.
2.  Inspect the existing `server.js`, `games/game1/`, and database
    behavior before changing the architecture.
3.  Preserve the existing team identification mechanism.
4.  Preserve the existing team scoreboard.
5.  Preserve the existing API/database communication.
6.  Keep Round 1 as a one-player game.
7.  Ensure the score is submitted once after completion.
8.  Wait for server confirmation before showing that the score was
    successfully added.
9.  Avoid creating a second backend, database, scoreboard, or project
    architecture.

------------------------------------------------------------------------

## 13. Testing Checklist

Before handover is considered complete, verify:

-   [ ] Round 1 loads correctly.
-   [ ] Correct team ID is detected.
-   [ ] One player can complete the game independently.
-   [ ] Memory matching works correctly.
-   [ ] Matched cards remain revealed.
-   [ ] Mismatched cards flip back.
-   [ ] Invalid card selections are prevented.
-   [ ] Final score is calculated.
-   [ ] Score is submitted only once.
-   [ ] Correct team ID is included in the submission.
-   [ ] Server confirms the result.
-   [ ] Team scoreboard receives the score.
-   [ ] Round 1 finishes after successful confirmation.
-   [ ] The game does not wait for teammates.
-   [ ] Other existing games/routes are not broken.

------------------------------------------------------------------------

## 14. Reference

The original Memory Card Matching Game development specification
requires the game to reuse the existing project architecture, team
identification, backend communication, and scoreboard/database
functionality rather than creating a separate architecture.
