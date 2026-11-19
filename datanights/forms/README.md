# Newsletter integration

The public Wix HOME, TEAM and FAQ pages had the same newsletter form: optional
Name, required Email and Submit. The footer contact is a mailto link to
contact@datahack.org.il. No live Wix submission was made.

The DataNights newsletter form was duplicated from DataCoach in the Datahack
Brevo account on 2026-11-19. Saved settings were read back: only the DataNights
list is selected, and double confirmation is enabled. The provider form has an
optional FIRSTNAME and a required EMAIL. No test submission was sent.

The module binds each captured inline form to Brevo's form endpoint. Browser
validation handles empty or malformed email. An asynchronous submission shows
an inline confirmation only when Brevo returns an explicit success; errors,
invalid responses and timeouts show an unconfirmed state and a link to the
hosted form. The no-JavaScript version links directly to that hosted form.
Owner testing of actual submission, confirmation email and list membership is
still required before declaring the flow verified.

Run `node --test datanights/forms/newsletter.test.cjs` and rebuild the preview
after changes. The form's optional name maps to Brevo FIRSTNAME.
