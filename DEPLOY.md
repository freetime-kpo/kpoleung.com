# Deploy — kpoleung.com (public tree)

Static HTML under the personal-site docroot. This repo mirrors **public** paths only:

- `/` homepage (`index.html`, `assets/`, `kpo.vcf`)
- `/c/` NFC contact landing
- `/notes/` public long articles
- `/lab/yolo/` lab demo

## Deploy (rsync example)

```bash
rsync -avz --delete \
  ./index.html ./kpo.vcf ./assets ./c ./notes ./lab \
  user@host:/path/to/Personal-site/
```

Do **not** publish private workspace trees (memo, auth configs, credentials) from this repo — they are not included.

## Smoke

- https://kpoleung.com/
- https://kpoleung.com/notes/
- https://kpoleung.com/lab/yolo/
- https://kpoleung.com/c/
