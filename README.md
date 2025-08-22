__*DISCLAIMER*__

This repository deliberately adds extra architectural surface area: multiple persistence backends (Mongo, Postgres, Redis), DDD-style layering, and a generalized migration subsystem as a deliberate practice environment for tackling "enterprise" style concerns at small scale. A production URL shortener of this size would normally use a single datastore and flatter modules. Treat this as an architectural sandbox; trim layers if you fork for a lean deployment.

# TODO

## Backend

- Add users & Auth
- Separate persistence into anon (redis, fs) vs auth (mongo, postgres). Rework client types, update docker compose to only require what is needed, update configs to only require what is needed
- Rate limits anonymous vs account
- Add integration tests
- Write proper README
- Fold in migration initial setup

### Stretch
- Add file system repo
- Add different code generation strategies

## Frontend

- User Dashboard
