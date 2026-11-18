# DataHack site migration preview

This Cloudflare Pages app is isolated from the legacy Jekyll site in the repository root. It covers the public Wix sitemap: home and team. Static content and locally bundled public Wix assets build offline.

From this directory, run `python3 build.py` and `node --test contact.test.mjs` (Node 22+). To serve static files with clean URLs and test the Pages Function, run `wrangler pages dev ./dist`.

`import_wix.py` is an optional, networked snapshot refresh; it requires Beautiful Soup. Review the public content and asset diff before publishing. The wordmark mirrors the live Wix site and the palette draws from the DataHack Brandbook in the shared Marketing drive. The Figma brand assets and historical site decisions still need review. The newsletter links to its existing standalone signup; the contact form does not subscribe anyone.

The preview is public but marked noindex, uses no custom domain, and can be deployed from this directory with `wrangler pages deploy ./dist --project-name datahack-org-preview` using DataHack's account credentials. Do not commit credentials.

The form deliberately returns 503 until the Workspace delivery adapter is configured. Deploy `mail-relay/` as a Google Apps Script web app under the designated DataHack technical account, executing as the deployer. Its only OAuth scope is sending mail; it cannot read Gmail. Set a random shared `CONTACT_TOKEN` in Script Properties and as a Cloudflare Pages secret. Set the deployment's `https://script.google.com/macros/s/.../exec` URL as the Pages `CONTACT_WEBHOOK` secret. Do not publish the endpoint or value in Git. The relay only sends to `contact@datahack.org.il`, reserves at most 35 sends per UTC day, and returns an explicit acknowledgement after MailApp accepts the send. Cloudflare follows only Google's Content Service redirect, without replaying the submission. Add production abuse protection and verify a tagged message arrives in the destination inbox before cutover. The unit tests mock the relay; they do not prove inbox delivery.

Before cutover: confirm the approved design and content, audit Wix functionality and records outside the public sitemap, review mobile and desktop rendering and links, and verify contact delivery. Preserve existing MX and other unrelated records and capture the current web records for rollback. Enable indexing and canonical URLs only for the approved production deployment. Do not remove Wix or request cancellation before production smoke tests pass.
