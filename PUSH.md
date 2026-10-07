# Pushing this to GitHub

```sh
cd smtp-outcome
git init -b main
git add .
git commit -m "smtp-outcome: classify SMTP responses and DSNs into delivery outcomes"
gh repo create smtp-outcome --public --source=. --push \
  --description "Classify SMTP responses and DSNs into normalised delivery outcomes, and decide what the sender should do next. Zero dependencies, TypeScript."
```

Without the `gh` CLI, create the repo in the browser and then:

```sh
git remote add origin https://github.com/dineshbabu-g-1423/smtp-outcome.git
git push -u origin main
```

## Before you push

- `npm install && npm run build && npm test` — 7 tests, all passing here.
- Set the repo topics to `smtp`, `email`, `deliverability`, `mta`, `bounce`, `dsn`.
  Topics are how anyone finds it.
- Leave `dkim2-java` private. See the note at the end.

## Publishing to npm (optional, but it is what makes it real)

```sh
npm login
npm publish --access public
```

An npm page with a version number reads differently from a repo. If the name is
taken, `@dineshbabu-g/smtp-outcome` works as a scoped package.

## What to say about it

> I wrote a library that turns SMTP responses and DSNs into a delivery
> outcome and a retry decision, because every sending system ends up with
> that logic buried in a retry loop and nobody has pulled it out.

Then the two design points worth leading with:

- **`X.7.1` does not outrank the response text.** It is the catch-all policy
  code and receivers attach it to spam blocks, authentication failures and
  reputation blocks alike. A test caught this: a Spamhaus rejection carrying
  `5.7.1` was being classified as a generic policy block.
- **A `4.x.x` never resolves to a permanent outcome.** Some subject codes map
  to "invalid recipient", but the transient class means try again, and a
  temporary lookup failure must not suppress a good address.

Both are the kind of thing you only know from having watched real traffic.

## One thing to do first

`dkim2-java` is currently public on your profile and its own README says
"Internal Zoho code... Not licensed for external distribution", with no LICENSE
file. Make it private before you link your GitHub from any application. It is
the first repo a reviewer sees, and for an ESP role it is the wrong first
impression entirely.
