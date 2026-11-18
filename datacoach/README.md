# DataCoach review site

The five public pages of the DataCoach Technion site are served by the
`datacoach-review` Cloudflare Pages project. This is an unindexed **review**
deployment. No custom domains, registrar changes, or Wix billing changes
are part of this deployment.

From this directory run `python3 build.py`, then `node --test contact.test.mjs`.
Preview with `wrangler pages dev dist`. Publish a reviewed build with
`wrangler pages deploy dist --project-name datacoach-review --branch main`
under the DataHack account. Normal builds use only committed assets.

The public desktop and mobile designs are in `design/`; the mobile layout
uses the original 320 CSS-pixel canvas. FAQ categories, slide content, menus
and supporting scripts are local. The mobile message shortcut opens Contact
rather than pretending to offer a staffed live chat. The two program
application links go to the original Google Forms, both closed when checked
on 2026-11-18. Do not create or reopen an intake form as a migration step.

The contact form includes the original name, address, subject and message.
Its Pages Function validates same-origin requests and the Turnstile action
and hostname before using the existing DataHack send-only Google Apps Script
relay. The subject is included in the message body and the recipient is fixed
at `contact@datahack.org.il`. The shared relay's daily limit applies across
sites. Provider-managed secrets are `CONTACT_WEBHOOK`, `CONTACT_TOKEN` and
`TURNSTILE_SECRET`; never put their values in Git or the public assets.

Keep contact and newsletter consent separate. A contact submission must never
subscribe the visitor, and an unsuccessful subscription must not display a
success message. Never use applicant data or an existing subscriber export
to test the site.
