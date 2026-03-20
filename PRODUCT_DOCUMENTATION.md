Fixture Hub Product Documentation
1. Product overview

Fixture Hub is a tournament-operations platform for sports events. It combines back-office tournament administration with a public-facing live scoreboard so organizers and spectators can work from the same underlying data. The current product flow is sport selection, tournament selection, access-level selection, and then entry into either the management workspace or live scoreboard. Netball is active today, and hockey is already present in the interface as a coming-soon sport.

The product is already beyond a simple scoreboard. It supports team and player administration, pool setup, round-robin fixture generation, manual scheduling, standings, playoff brackets, PDF/CSV exports, and live viewing. The tournament settings surface also shows product intent beyond MVP basics by including branding, sponsorship, registration, venue, and operational settings.

2. Problem statement

Tournament organizers often run events across disconnected tools: spreadsheets for teams, manual messaging for schedule changes, paper printouts for fixtures, and ad hoc public communication for results. Fixture Hub addresses that fragmentation by giving organizers one operational system that also feeds a public scoreboard. Realtime subscriptions make admin updates visible in the live view without a separate publishing step.

This reduces administrative overhead during live events and improves the participant and spectator experience. In practical terms, it helps event staff move faster while also reducing confusion about who plays next, where a match is happening, and how standings are changing.

3. Target users

The product currently implies three main user groups.

Tournament administrators create and configure tournaments, import teams and players, assign pools, generate fixtures, manage schedules, enter scores, and operate playoffs.

Viewers consume tournament information in a reduced, read-only mode. They do not manage data but can follow standings, fixtures, and playoff progress.

Public audiences use the scoreboard route to see upcoming matches, recent results, and current standings. This is the venue-display and spectator-information surface of the product.

4. Core user journeys
4.1 Organizer journey

An organizer selects a sport, opens or creates a tournament, authenticates as an admin, configures settings, imports or adds teams, assigns pools, generates fixtures, schedules matches, enters scores, checks standings, generates playoffs, and then runs the live event while the scoreboard reflects updates.

4.2 Viewer journey

A viewer selects a tournament, enters the read-only management route, and follows fixtures, standings, and playoffs without being able to change data.

4.3 Public scoreboard journey

A spectator or venue screen opens the scoreboard page and sees a live clock, the current tournament name, upcoming matches, recent results, and per-pool standings. The page automatically refreshes as tournament data changes.

5. Current feature set

The current product already includes:

tournament selection and administration with active/archive views

sport entry with a multi-sport direction

admin and viewer access separation

team management with CSV import

player management with CSV import

pool setup

round-robin fixture generation

manual fixture creation

fixture scheduling by date, time, and venue

score entry and clearing

standings calculation

playoff generation and scoring

CSV and PDF export

tournament branding/logo upload

pre-match notifications at 10 and 5 minutes before kickoff

live scoreboard with recent results and standings.

That makes Fixture Hub a credible tournament-operations MVP rather than a concept mockup.

6. Product strengths

The biggest strength is workflow consolidation. The same system supports tournament setup, event-day operations, and public communication. This is valuable because it reduces friction for organizers and avoids duplicate data entry across different tools.

The second strength is realtime visibility. Because the system listens for changes across the tournament and its child records, it can keep the live scoreboard in sync with organizer actions. That is important for school, club, and weekend-event environments where information changes frequently during the day.

The third strength is commercial readiness in the settings model. Fields for host organization, sponsor names, contact details, theme color, invite code, and registration options suggest the product is already moving toward a professional event-administration offering rather than a narrow internal-only tool.

7. Product limitations and risks

The most important business risk is trust and security. A client-side hard-coded password for reopening closed rounds is not suitable for a professional tournament product and would raise red flags in any serious customer review.

The second limitation is multi-event maturity. The scoreboard currently depends on an implicit default tournament chosen by earliest creation order, not by an explicit “active” or “featured live” setting. That will become confusing once customers run multiple tournaments.

The third limitation is lifecycle consistency. The tournament selector correctly models archive and restore through archived_at, but the management workspace archive action does not use the same mechanism. That creates room for operator confusion and inconsistent system state.

The fourth limitation is maturity of outward-facing documentation. The repository still presents a generic Lovable README and no repo description or website, which weakens onboarding, sales readiness, and due-diligence readiness.

8. Product positioning

Fixture Hub should be positioned as a tournament operating system for schools, clubs, and community or regional sports organizers. It is strongest when framed as an event-execution platform, not just a scoreboard. The combination of imports, scheduling, standings, playoffs, exports, and public display gives it practical value on event day.

A strong positioning statement would be:

Fixture Hub helps tournament organizers run competitions from setup to live delivery in one system, with real-time updates for both staff and spectators.

That statement matches the actual codebase more closely than a narrower scoreboard-oriented description.

9. Likely customer segments

The current implementation is especially well suited to:

schools running inter-school sports days

clubs managing weekend tournaments

community and district sports coordinators

event hosts who need both internal control and public display

organizers who still rely partly on spreadsheets and printable outputs.

The PDF and CSV workflows matter commercially because they make the product usable in mixed digital/manual environments, which is common in school and grassroots sports operations.

10. Operational value to customers

Fixture Hub reduces administrative load by letting staff create teams, players, pools, and fixtures in one place. It improves match-day clarity by surfacing schedules, venues, standings, and results in near real time. It also creates a cleaner communication loop because the same tournament state can drive both organizer workflows and the scoreboard view.

The 10-minute and 5-minute pre-kickoff notifications add another operational benefit: they help coordinators stay ahead of the schedule rather than reacting late to missed or delayed fixtures.

11. Recommended business roadmap

First, harden the trust layer. Remove insecure frontend controls, make admin rights fully role-driven, and be able to explain the security model clearly to customers.

Second, formalize tournament lifecycle. Add clear product states such as draft, live, archived, and public; introduce an explicit active/public-live tournament selection model; and make archive behavior consistent everywhere.

Third, package the commercial features that already exist. Branding, sponsorship, registration controls, exports, and public display can become part of a stronger market-facing offering.

Fourth, improve outward-facing documentation and demo readiness. A real README, product overview, setup guide, and screenshots would materially improve customer confidence and partner/investor conversations.

12. Suggested product KPIs

The current codebase suggests a KPI set worth tracking once analytics are added:

tournaments created per organization

average teams per tournament

percentage of tournaments using CSV import

percentage of fixtures scheduled with date/time/venue

score-entry completeness rate

scoreboard view sessions during live events

playoff generation rate

archived tournaments per season

admin-to-viewer usage ratio

export usage for PDF and CSV.

These KPIs match how the current product is actually used rather than imposing a generic SaaS metric set.

13. Executive summary

Fixture Hub is already a meaningful MVP for tournament administration and live-event operations. Its strongest asset is that it combines organizer control and public visibility in one product. The immediate work is not mainly about adding more features; it is about maturing the platform through stronger security, more explicit tournament lifecycle handling, more robust persistence, and better documentation.

With those improvements, the product has a clear path from a capable internal tool to a sellable tournament-operations platform for schools, clubs, and community sports organizers.
