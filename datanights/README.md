# DataNights review site

This directory builds the independent Cloudflare Pages review copy of the
public DataNights Wix site. The project is `datanights-review`; only its
`pages.dev` address is in scope. Do not attach a custom domain, update DNS,
or change a Wix subscription as part of preview deployment.

## Build and preview

From this directory, use Python 3 and Wrangler with DataHack-scoped access:

```sh
python3 build.py
python3 check_build.py
node --test forms/*.test.*
wrangler pages deploy dist --project-name datanights-review --branch review
```

The build uses the checked-in public page captures and assets, not a live
request to Wix. The five public routes are home (/), team (/blank), FAQ
(/blank-1), /privacy-policy and /accessibility-statement. Preserve the
original paths when linking to internal pages. The two policy pages contain
Wix template text; their inclusion is not a legal or accessibility review.

Review the live preview at desktop and phone widths, exercise navigation and
FAQ controls, and verify the newsletter confirmation in a controlled mailbox.
The public contact address is a mail link, not a separate contact form.
Keep account credentials, subscriber data and test messages out of Git.
