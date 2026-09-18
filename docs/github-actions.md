# GitHub Actions for this project

This file explains GitHub Actions from zero, how it replaced Travis CI here, and how to run and debug the workflow. The Docker and AWS flow is unchanged: test the React client, push four images to Docker Hub, then deploy `docker-compose.yml` to Elastic Beanstalk.

## Why we left Travis

Travis CI was connected to GitHub, but your **GitHub Student Developer Pack** plan expired on **August 17, 2026**. After that, pushes created a queued check that never started (no free credits). GitHub Actions is included for this **public** repository, so you do not need a Travis paid plan or a card.

`.travis.yml` is still in the repo so you can compare. GitHub does not run it. Only files under `.github/workflows/` run as Actions.

## What GitHub Actions is

GitHub Actions is CI/CD built into GitHub.

1. You commit a YAML file to `.github/workflows/`.
2. On a **push** (or a manual click), GitHub starts a virtual machine (the **runner**).
3. The runner checks out your code and runs **steps** in order.
4. If a step fails, later steps are skipped (unless you configure otherwise).
5. The result shows as a check on the commit and in the **Actions** tab.

That is the same idea as Travis: a config file, a cloud machine, tests, then deploy.

## Where to click in GitHub

| Place | What it is |
| --- | --- |
| Repo **Actions** tab | List of workflow runs. Open one to see logs. |
| A commit on **master** | A yellow/green/red check. Click it → **Details** → the workflow. |
| **Settings → Secrets and variables → Actions** | Passwords and keys. The workflow reads them as `${{ secrets.NAME }}`. They never appear in logs if you use them this way. |
| **Actions → Deploy → Run workflow** | Manual run (`workflow_dispatch`). Useful while you learn. |

Colors:

- **Yellow** — running
- **Green** — all steps succeeded
- **Red** — a step failed; open that step and read the log
- **Grey skip** — a step was skipped (for example Elastic Beanstalk deploy when the branch is not `master`)

## YAML words you will see

The workflow file is [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml).

- **`name`** — Title in the Actions tab (`Deploy`).
- **`on`** — When to run. `push` = every git push. `workflow_dispatch` = the **Run workflow** button.
- **`jobs`** — One or more jobs. We have one job called `build` (same as a Travis job).
- **`runs-on`** — The machine. `ubuntu-latest` already has Docker, like Travis `services: docker`.
- **`env`** — Environment variables for every step. `DOCKER_ID` is set from the secret so `docker build -t $DOCKER_ID/...` matches Travis.
- **`steps`** — Ordered list. One failure stops the rest of this job.
- **`uses:`** — Reuse a published action (checkout, Docker login, Beanstalk deploy).
- **`run:`** — Shell commands, same as Travis list items under `before_install` / `script` / `after_success`.
- **`if:`** — Run this step only when the condition is true.
- **`${{ secrets.DOCKER_ID }}`** — GitHub injects the secret at runtime. Same role as Travis `$DOCKER_ID`.

## Travis → this workflow

Travis phases in `.travis.yml` map like this:

| Travis | GitHub Actions step |
| --- | --- |
| (clone the repo) | `actions/checkout@v4` |
| `before_install`: build `Dockerfile.dev` | **Build React test image** |
| `script`: `npm test` with `CI=true` | **Run tests** |
| `after_success`: four `docker build`s | **Build production images** |
| `docker login` + four `docker push` | **Log in to Docker Hub** + **Push images** |
| `deploy` Elastic Beanstalk on `master` | **Generate ... package** + **Deploy to Elastic Beanstalk** (`if: github.ref == 'refs/heads/master'`) |

Unchanged on purpose:

- Test image: `client/Dockerfile.dev`, tag `$DOCKER_ID/react-test`
- Production images: `multi-client`, `multi-nginx`, `multi-server`, `multi-worker`
- AWS region `us-east-1`, app `multi-docker`, env `MultiDocker-env`
- S3 bucket `elasticbeanstalk-us-east-1-148221445676`, path `docker-multi`
- Elastic Beanstalk still **pulls images from Docker Hub** using [`docker-compose.yml`](../docker-compose.yml). CI does not rebuild on AWS.

```text
Push to GitHub
    → checkout
    → docker build (client Dockerfile.dev)
    → docker run npm test
    → docker build (client, nginx, server, worker)
    → docker login + push four images
    → if branch is master: zip repo (no .git) → upload to S3 → update Beanstalk
    → Beanstalk starts containers from the Hub images in docker-compose.yml
```

## Secrets you must add (once)

Use the **same values** you had in Travis.

1. Open the GitHub repo **mutli-docker**.
2. **Settings → Secrets and variables → Actions → New repository secret**.
3. Create these four names (names must match exactly):

| Secret name | What it is |
| --- | --- |
| `DOCKER_ID` | Docker Hub username (also used in image tags, e.g. `mohamedhanyyyy`) |
| `DOCKER_PASSWORD` | Docker Hub password or access token |
| `AWS_ACCESS_KEY` | IAM access key id (same as Travis `$AWS_ACCESS_KEY`) |
| `AWS_SECRET_KEY` | IAM secret key (same as Travis `$AWS_SECRET_KEY`) |

Do not put these in YAML. If a secret is missing, Docker login or AWS deploy will fail with an auth error.

`docker-compose.yml` already pins Hub names like `mohamedhanyyyy/multi-client`. `DOCKER_ID` must be that Hub user so Beanstalk pulls the images you just pushed.

## How to run it

1. Add the four secrets.
2. Push to `master`, or **Actions → Deploy → Run workflow** and choose `master`.
3. Open the run. Steps expand as they finish. Tests run first; deploy is last and only on `master`.

On a branch other than `master`, tests and Docker Hub pushes still run (same as Travis `script` + `after_success`). The zip and Beanstalk steps are skipped.

## How to read a failure

1. Open the red run → click the failed step.
2. **Build React test image** — Dockerfile or context path problem.
3. **Run tests** — a Jest/React test failed (same as Travis `script`).
4. **Build production images** — a production Dockerfile failed.
5. **Log in / Push** — wrong `DOCKER_ID` or `DOCKER_PASSWORD`, or Hub rate limit.
6. **Deploy to Elastic Beanstalk** — wrong AWS keys, missing IAM permissions, or the EB env name/app/bucket do not match AWS.

**Re-run jobs** (top right of a run) repeats the same commit without a new push.

## Manual run vs push

- **Push** — normal path; every commit on GitHub can get a check.
- **Run workflow** — same YAML, you pick the branch. Use this after adding secrets to avoid extra dummy commits.

## What we did not change

No Dockerfiles, no `docker-compose.yml` / `docker-compose-dev.yml`, no AWS console settings, no application code. `.travis.yml` is reference only.
